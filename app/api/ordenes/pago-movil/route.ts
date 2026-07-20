import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarOrdenRecibida, notificarAdminNuevaOrden } from "@/lib/email";

// Crea una orden de pago móvil (queda 'pendiente' hasta que un admin la
// confirme) y dispara los correos: "orden recibida" al comprador y aviso al
// admin para que la valide. El comprobante ya se subió a Storage desde el
// cliente antes de llamar aquí.
export async function POST(request: NextRequest) {
  const { slug, nombre, email, referencia, comprobantePath } = await request.json();
  if (!slug || !nombre || !email) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: fila, error: rpcError } = await supabase
    .rpc("crear_orden", {
      p_recurso_slug: slug,
      p_nombre: String(nombre).trim(),
      p_email: String(email).trim(),
      p_metodo: "pago_movil",
      p_referencia: referencia ? String(referencia).trim() : null,
      p_comprobante_path: comprobantePath ?? null,
    })
    .maybeSingle<{ orden_id: string; token_descarga: string; monto: number }>();

  if (rpcError || !fila) {
    return NextResponse.json({ error: rpcError?.message || "No se pudo crear la orden" }, { status: 400 });
  }

  const { data: recurso } = await supabase
    .from("recursos")
    .select("titulo")
    .eq("slug", slug)
    .maybeSingle();
  const titulo = recurso?.titulo ?? slug;

  await Promise.all([
    enviarOrdenRecibida({ email: String(email).trim(), nombre: String(nombre).trim(), titulo }),
    notificarAdminNuevaOrden({
      titulo,
      nombre: String(nombre).trim(),
      email: String(email).trim(),
      referencia: referencia ? String(referencia).trim() : null,
    }),
  ]);

  return NextResponse.json({ token: fila.token_descarga });
}
