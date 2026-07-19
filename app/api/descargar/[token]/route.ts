import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Entrega el archivo comprado: valida que la orden esté pagada/entregada y
// que no se haya agotado el límite de descargas, luego redirige a una URL
// firmada de corta duración del bucket privado 'recursos'.
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const supabase = createAdminClient();

  const { data: orden } = await supabase
    .from("ordenes")
    .select("id, estado, descargas, max_descargas, recursos(archivo_path)")
    .eq("token_descarga", token)
    .maybeSingle<{
      id: string;
      estado: string;
      descargas: number;
      max_descargas: number;
      recursos: { archivo_path: string | null } | null;
    }>();

  if (!orden) {
    return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
  }
  if (!["pagada", "entregada"].includes(orden.estado)) {
    return NextResponse.json({ error: "El pago aún no está confirmado" }, { status: 403 });
  }
  if (orden.descargas >= orden.max_descargas) {
    return NextResponse.json({ error: "Se alcanzó el límite de descargas" }, { status: 403 });
  }
  const archivoPath = orden.recursos?.archivo_path;
  if (!archivoPath) {
    return NextResponse.json({ error: "El recurso no tiene archivo disponible" }, { status: 404 });
  }

  const { data: firmada, error } = await supabase.storage
    .from("recursos")
    .createSignedUrl(archivoPath, 60);
  if (error || !firmada) {
    return NextResponse.json({ error: "No se pudo generar la descarga" }, { status: 500 });
  }

  await supabase.from("ordenes").update({ descargas: orden.descargas + 1 }).eq("id", orden.id);

  return NextResponse.redirect(firmada.signedUrl);
}
