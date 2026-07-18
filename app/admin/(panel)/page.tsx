import { createClient } from "@/lib/supabase/server";
import { actualizarEstadoCita, actualizarEstadoOrden } from "../actions";

export const dynamic = "force-dynamic";

type Cita = {
  id: string;
  fecha: string;
  hora: string;
  modalidad: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  motivo: string | null;
  estado: string;
};

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
  confirmada: "bg-brand-tint text-brand-dark",
  pagada: "bg-brand-tint text-brand-dark",
  entregada: "bg-brand-tint text-brand-dark",
  cancelada: "bg-[#f0edeb] text-muted",
  rechazada: "bg-[#fbeaea] text-[#a33]",
};

function fechaLarga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d} ${meses[m - 1]} ${y}`;
}

export default async function PanelPage() {
  const supabase = await createClient();

  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: citas }, { data: ordenes }] = await Promise.all([
    supabase
      .from("citas")
      .select("*")
      .gte("fecha", hoy)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true })
      .returns<Cita[]>(),
    supabase
      .from("ordenes")
      .select("*, recursos(titulo)")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Orden[]>(),
  ]);

  // Enlaces firmados temporales para los comprobantes de pago.
  const firmados: Record<string, string> = {};
  const conComprobante = (ordenes ?? []).filter((o) => o.comprobante_path);
  await Promise.all(
    conComprobante.map(async (o) => {
      const { data } = await supabase.storage
        .from("comprobantes")
        .createSignedUrl(o.comprobante_path!, 3600);
      if (data?.signedUrl) firmados[o.id] = data.signedUrl;
    }),
  );

  return (
    <div className="grid gap-10">
      {/* CITAS */}
      <section>
        <h2 className="mb-4 font-serif text-[26px] text-ink">
          Próximas citas{" "}
          <span className="text-[15px] text-muted">({citas?.length ?? 0})</span>
        </h2>
        {!citas?.length ? (
          <p className="text-[15px] text-body">No hay citas próximas.</p>
        ) : (
          <div className="grid gap-3">
            {citas.map((c) => (
              <div
                key={c.id}
                className="rounded-[14px] border border-line bg-white p-4 sm:flex sm:items-center sm:gap-4"
              >
                <div className="min-w-[130px] font-serif text-[17px] text-ink">
                  {fechaLarga(c.fecha)}
                  <div className="text-[14px] text-brand">
                    {c.hora.slice(0, 5)} · {c.modalidad}
                  </div>
                </div>
                <div className="mt-2 flex-1 sm:mt-0">
                  <div className="text-[15px] text-ink">{c.nombre}</div>
                  <div className="text-[13px] text-body">
                    {[c.email, c.telefono].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {c.motivo && (
                    <div className="mt-1 text-[13px] text-muted">{c.motivo}</div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 sm:mt-0">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[12px] ${BADGE[c.estado] ?? ""}`}
                  >
                    {c.estado}
                  </span>
                  {c.estado === "pendiente" && (
                    <form action={actualizarEstadoCita}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="estado" value="confirmada" />
                      <button className="rounded-full bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-110">
                        Confirmar
                      </button>
                    </form>
                  )}
                  {c.estado !== "cancelada" && (
                    <form action={actualizarEstadoCita}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="estado" value="cancelada" />
                      <button className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body hover:bg-cream">
                        Cancelar
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ÓRDENES */}
      <section>
        <h2 className="mb-4 font-serif text-[26px] text-ink">
          Órdenes de recursos{" "}
          <span className="text-[15px] text-muted">({ordenes?.length ?? 0})</span>
        </h2>
        {!ordenes?.length ? (
          <p className="text-[15px] text-body">Aún no hay órdenes.</p>
        ) : (
          <div className="grid gap-3">
            {ordenes.map((o) => (
              <div
                key={o.id}
                className="rounded-[14px] border border-line bg-white p-4 sm:flex sm:items-center sm:gap-4"
              >
                <div className="flex-1">
                  <div className="text-[15px] text-ink">
                    {o.recursos?.titulo ?? "—"}{" "}
                    <span className="text-[14px] text-body">
                      · ${o.monto} {o.moneda}
                    </span>
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
                        <a
                          href={firmados[o.id]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand underline"
                        >
                          ver comprobante
                        </a>
                      </>
                    ) : (
                      ""
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2 sm:mt-0">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[12px] ${BADGE[o.estado] ?? ""}`}
                  >
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
      </section>
    </div>
  );
}
