import { createClient } from "@/lib/supabase/server";
import { actualizarEstadoOrden } from "../../actions";

export const dynamic = "force-dynamic";

type Orden = {
  id: string;
  comprador_nombre: string;
  comprador_email: string;
  monto: number;
  moneda: string;
  metodo_pago: string;
  referencia_pago: string | null;
  comprobante_path: string | null;
  estado: string;
  created_at: string;
  recursos: { titulo: string } | null;
};

const BADGE: Record<string, string> = {
  pendiente: "bg-[#fdf3e2] text-[#a87b25]",
  pagada: "bg-brand-tint text-brand-dark",
  entregada: "bg-brand-tint text-brand-dark",
  rechazada: "bg-[#fbeaea] text-[#a33]",
};

export default async function OrdenesPage() {
  const supabase = await createClient();
  const { data: ordenes } = await supabase
    .from("ordenes")
    .select("*, recursos(titulo)")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Orden[]>();

  const firmados: Record<string, string> = {};
  await Promise.all(
    (ordenes ?? [])
      .filter((o) => o.comprobante_path)
      .map(async (o) => {
        const { data } = await supabase.storage
          .from("comprobantes")
          .createSignedUrl(o.comprobante_path!, 3600);
        if (data?.signedUrl) firmados[o.id] = data.signedUrl;
      }),
  );

  return (
    <div className="grid gap-5">
      <h1 className="font-serif text-[28px] text-ink">
        Órdenes{" "}
        <span className="text-[16px] text-muted">({ordenes?.length ?? 0})</span>
      </h1>

      {!ordenes?.length ? (
        <p className="text-[15px] text-body">Aún no hay órdenes.</p>
      ) : (
        <div className="grid gap-3">
          {ordenes.map((o) => (
            <div key={o.id} className="rounded-[14px] border border-line bg-white p-4 sm:flex sm:items-center sm:gap-4">
              <div className="flex-1">
                <div className="text-[15px] text-ink">
                  {o.recursos?.titulo ?? "—"}{" "}
                  <span className="text-[14px] text-body">· ${o.monto} {o.moneda}</span>
                </div>
                <div className="text-[13px] text-body">
                  {o.comprador_nombre} · {o.comprador_email}
                </div>
                <div className="mt-1 text-[13px] text-muted">
                  {o.metodo_pago}
                  {o.referencia_pago ? ` · ref: ${o.referencia_pago}` : ""}
                  {firmados[o.id] ? (
                    <>
                      {" · "}
                      <a href={firmados[o.id]} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                        ver comprobante
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 sm:mt-0">
                <span className={`rounded-full px-2.5 py-1 text-[12px] ${BADGE[o.estado] ?? ""}`}>
                  {o.estado}
                </span>
                {o.estado === "pendiente" && (
                  <>
                    <form action={actualizarEstadoOrden}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="estado" value="pagada" />
                      <button className="rounded-full bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-110">
                        Confirmar pago
                      </button>
                    </form>
                    <form action={actualizarEstadoOrden}>
                      <input type="hidden" name="id" value={o.id} />
                      <input type="hidden" name="estado" value="rechazada" />
                      <button className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body hover:bg-cream">
                        Rechazar
                      </button>
                    </form>
                  </>
                )}
                {o.estado === "pagada" && (
                  <form action={actualizarEstadoOrden}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="estado" value="entregada" />
                    <button className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body hover:bg-cream">
                      Marcar entregada
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
