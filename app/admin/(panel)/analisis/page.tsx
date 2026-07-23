import { createClient } from "@/lib/supabase/server";
import { porCanal, resumenCitas, resumenPagosPendientes, resumenTienda, serieMensual, topRecursos, type CitaAnalisis, type OrdenAnalisis, type RecursoAnalisis } from "./analisis-datos";
import { AnalisisCharts } from "./AnalisisCharts";

export const dynamic = "force-dynamic";

export default async function AnalisisPage() {
  const supabase = await createClient();

  const [citasRes, ordenesRes, recursosRes] = await Promise.all([
    supabase
      .from("citas")
      .select("fecha, estado, modalidad, monto, pagado, veces_reagendada, canal")
      .returns<CitaAnalisis[]>(),
    supabase
      .from("ordenes")
      .select("monto, estado, metodo_pago, recurso_id, created_at, confirmado_at, recursos(titulo, categoria)")
      .returns<OrdenAnalisis[]>(),
    supabase.from("recursos").select("id, titulo, categoria, activo").returns<RecursoAnalisis[]>(),
  ]);

  const citas = citasRes.data ?? [];
  const ordenes = ordenesRes.data ?? [];
  const recursos = recursosRes.data ?? [];

  const datos = {
    citas: resumenCitas(citas),
    pagosPendientes: resumenPagosPendientes(citas),
    tienda: resumenTienda(ordenes),
    serie: serieMensual(citas, ordenes),
    top: topRecursos(ordenes, recursos),
    canal: porCanal(citas),
    totalRecursos: recursos.length,
    recursosActivos: recursos.filter((r) => r.activo).length,
  };

  return (
    <div className="grid gap-8">
      <h1 className="font-serif text-[28px] text-ink">Análisis</h1>
      <AnalisisCharts datos={datos} />
    </div>
  );
}
