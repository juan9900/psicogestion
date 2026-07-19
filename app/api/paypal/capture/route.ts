import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { capturePaypalOrder } from "@/lib/paypal";

// Captura el pago aprobado en PayPal, verifica monto/estado contra la BD
// (nunca confía en lo que envía el cliente) e inserta la orden ya pagada.
export async function POST(request: NextRequest) {
  const { paypalOrderId, slug, nombre, email } = await request.json();
  if (!paypalOrderId || !slug || !email) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: recurso } = await supabase
    .from("recursos")
    .select("id, precio_usd")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (!recurso) {
    return NextResponse.json({ error: "Recurso no disponible" }, { status: 404 });
  }

  let capture;
  try {
    capture = await capturePaypalOrder(paypalOrderId);
  } catch {
    return NextResponse.json({ error: "No se pudo capturar el pago" }, { status: 502 });
  }

  const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
  const capturado = captureUnit?.status === "COMPLETED";
  const montoCapturado = Number(captureUnit?.amount?.value ?? "0");
  const monedaCapturada = captureUnit?.amount?.currency_code;
  const captureId = captureUnit?.id;

  if (!capturado || !captureId) {
    return NextResponse.json({ error: "El pago no se completó" }, { status: 402 });
  }
  // El monto capturado debe coincidir con el precio actual en la BD: si no,
  // algo no cuadra (precio cambiado entre create y capture, manipulación, etc.).
  if (montoCapturado !== Number(recurso.precio_usd) || monedaCapturada !== "USD") {
    return NextResponse.json({ error: "El monto capturado no coincide con el precio" }, { status: 409 });
  }

  // Idempotencia: si ya procesamos esta captura (doble clic, reintento del
  // cliente), devolvemos el token existente en vez de duplicar la orden.
  const { data: existente } = await supabase
    .from("ordenes")
    .select("token_descarga")
    .eq("referencia_pago", captureId)
    .maybeSingle();
  if (existente) {
    return NextResponse.json({ token: existente.token_descarga });
  }

  const { data: orden, error } = await supabase
    .from("ordenes")
    .insert({
      recurso_id: recurso.id,
      comprador_nombre: String(nombre ?? "").trim() || "—",
      comprador_email: String(email).trim().toLowerCase(),
      monto: recurso.precio_usd,
      moneda: "USD",
      metodo_pago: "paypal",
      referencia_pago: captureId,
      estado: "pagada",
      confirmado_at: new Date().toISOString(),
    })
    .select("token_descarga")
    .single();

  if (error || !orden) {
    return NextResponse.json({ error: "No se pudo registrar la orden" }, { status: 500 });
  }

  return NextResponse.json({ token: orden.token_descarga });
}
