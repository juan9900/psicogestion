import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
function fechaCorta(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

function Stat({ label, valor, href }: { label: string; valor: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-[14px] border border-line bg-white p-5 transition hover:border-brand"
    >
      <div className="font-serif text-[34px] leading-none text-ink">{valor}</div>
      <div className="mt-1.5 text-[13px] text-body">{label}</div>
    </Link>
  );
}

export default async function ResumenPage() {
  const supabase = await createClient();
  const hoy = new Date().toISOString().slice(0, 10);

  const [proximas, citasPend, ordenesPend, listaCitas, listaOrdenes] = await Promise.all([
    supabase.from("citas").select("*", { count: "exact", head: true }).gte("fecha", hoy).neq("estado", "cancelada"),
    supabase.from("citas").select("*", { count: "exact", head: true }).eq("estado", "pendiente").gte("fecha", hoy),
    supabase.from("ordenes").select("*", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase
      .from("citas")
      .select("id, fecha, hora, nombre, estado")
      .gte("fecha", hoy)
      .neq("estado", "cancelada")
      .order("fecha")
      .order("hora")
      .limit(6)
      .returns<{ id: string; fecha: string; hora: string; nombre: string; estado: string }[]>(),
    supabase
      .from("ordenes")
      .select("id, comprador_nombre, monto, metodo_pago, estado, recursos(titulo)")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false })
      .limit(6)
      .returns<
        { id: string; comprador_nombre: string; monto: number; metodo_pago: string; recursos: { titulo: string } | null }[]
      >(),
  ]);

  const citas = listaCitas.data ?? [];
  const ordenes = listaOrdenes.data ?? [];

  return (
    <div className="grid gap-8">
      <h1 className="font-serif text-[28px] text-ink">Resumen</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Citas próximas" valor={proximas.count ?? 0} href="/admin/citas" />
        <Stat label="Citas por confirmar" valor={citasPend.count ?? 0} href="/admin/citas" />
        <Stat label="Órdenes pendientes" valor={ordenesPend.count ?? 0} href="/admin/ordenes" />
      </div>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-[20px] text-ink">Próximas citas</h2>
          <Link href="/admin/citas" className="text-[13px] text-brand">Ver calendario →</Link>
        </div>
        {!citas.length ? (
          <p className="text-[14px] text-body">No hay citas próximas.</p>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-line bg-white">
            {citas.map((c, i) => (
              <div key={c.id} className={`flex items-center gap-3 px-4 py-3 text-[14px] ${i ? "border-t border-line" : ""}`}>
                <span className="w-[64px] flex-none text-brand">{fechaCorta(c.fecha)}</span>
                <span className="w-[48px] flex-none text-body">{c.hora.slice(0, 5)}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{c.nombre}</span>
                {c.estado === "pendiente" && (
                  <span className="flex-none whitespace-nowrap rounded-full bg-[#fdf3e2] px-2 py-0.5 text-[11px] text-[#a87b25]">por confirmar</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-[20px] text-ink">Órdenes por revisar</h2>
          <Link href="/admin/ordenes" className="text-[13px] text-brand">Ver órdenes →</Link>
        </div>
        {!ordenes.length ? (
          <p className="text-[14px] text-body">Sin órdenes pendientes.</p>
        ) : (
          <div className="overflow-hidden rounded-[14px] border border-line bg-white">
            {ordenes.map((o, i) => (
              <div key={o.id} className={`flex items-center gap-3 px-4 py-3 text-[14px] ${i ? "border-t border-line" : ""}`}>
                <span className="min-w-0 flex-1 truncate text-ink">{o.recursos?.titulo ?? "—"}</span>
                <span className="hidden min-w-0 flex-1 truncate text-body sm:block">{o.comprador_nombre}</span>
                <span className="flex-none text-right text-body">${o.monto}</span>
                <span className="hidden w-[80px] flex-none text-right text-[12px] text-muted sm:block">{o.metodo_pago}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
