import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createPaypalOrder } from "@/lib/paypal";

// Crea una orden en PayPal. El monto SIEMPRE se lee del precio guardado en
// la base de datos (nunca del cliente), igual que hace la RPC crear_orden.
export async function POST(request: NextRequest) {
  const { slug } = await request.json();
  if (!slug) {
    return NextResponse.json({ error: "Falta el recurso" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: recurso } = await supabase
    .from("recursos")
    .select("precio_usd")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle();

  if (!recurso) {
    return NextResponse.json({ error: "Recurso no disponible" }, { status: 404 });
  }

  try {
    const order = await createPaypalOrder(Number(recurso.precio_usd));
    return NextResponse.json({ id: order.id });
  } catch {
    return NextResponse.json({ error: "No se pudo iniciar el pago con PayPal" }, { status: 502 });
  }
}
