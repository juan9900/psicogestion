"use client";

import { useMemo, useState } from "react";
import { actualizarEstadoOrden } from "../../actions";
import { toggleDir, sortBy, type SortState } from "@/lib/tablas";
import { filtrarOrdenes, rankEstadoOrden, type Orden } from "./ordenes-filtros";

const BADGE: Record<string, string> = {
  pendiente: "bg-[#fdf3e2] text-[#a87b25]",
  pagada: "bg-brand-tint text-brand-dark",
  entregada: "bg-brand-tint text-brand-dark",
  rechazada: "bg-[#fbeaea] text-[#a33]",
};

const selectCls =
  "rounded-[10px] border border-line-2 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

const COLUMNS: { key: string; label: string }[] = [
  { key: "recurso", label: "Recurso" },
  { key: "comprador", label: "Comprador" },
  { key: "monto", label: "Monto" },
  { key: "metodo_pago", label: "Método" },
  { key: "estado", label: "Estado" },
  { key: "created_at", label: "Fecha" },
];

function accessor(orden: Orden, key: string): string | number {
  switch (key) {
    case "recurso":
      return orden.recursos?.titulo ?? "";
    case "comprador":
      return orden.comprador_nombre;
    case "monto":
      return orden.monto;
    case "metodo_pago":
      return orden.metodo_pago;
    case "estado":
      return rankEstadoOrden(orden.estado);
    case "created_at":
    default:
      return orden.created_at;
  }
}

export function OrdenesTabla({
  ordenes,
  firmados,
}: {
  ordenes: Orden[];
  firmados: Record<string, string>;
}) {
  const [estado, setEstado] = useState("");
  const [metodo, setMetodo] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "created_at", dir: "desc" });

  const filas = useMemo(() => {
    const filtradas = filtrarOrdenes(ordenes, { estado, metodo, q });
    if (!sort) return filtradas;
    return sortBy(filtradas, (o) => accessor(o, sort.key), sort.dir);
  }, [ordenes, estado, metodo, q, sort]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <select value={estado} onChange={(e) => setEstado(e.target.value)} className={selectCls}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="pagada">Pagada</option>
          <option value="entregada">Entregada</option>
          <option value="rechazada">Rechazada</option>
        </select>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={selectCls}>
          <option value="">Todos los métodos</option>
          <option value="pago_movil">Pago móvil</option>
          <option value="paypal">PayPal</option>
          <option value="usdt">USDT</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className={`${selectCls} flex-1 min-w-[200px]`}
        />
      </div>

      {filas.length === 0 ? (
        <p className="text-[15px] text-body">No hay órdenes con esos filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[820px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                {COLUMNS.map((col) => {
                  const activa = sort?.key === col.key;
                  return (
                    <th key={col.key} className="px-4 py-3 font-normal">
                      <button
                        onClick={() => setSort((cur) => toggleDir(cur, col.key))}
                        className={`flex items-center gap-1 hover:text-ink ${activa ? "text-ink" : ""}`}
                      >
                        {col.label}
                        {activa && <span>{sort?.dir === "asc" ? "▲" : "▼"}</span>}
                      </button>
                    </th>
                  );
                })}
                <th className="px-4 py-3 font-normal">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{o.recursos?.titulo ?? "—"}</td>
                  <td className="px-4 py-3 text-body">
                    <div className="text-ink">{o.comprador_nombre}</div>
                    <div className="text-muted">{o.comprador_email}</div>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    ${o.monto} {o.moneda}
                  </td>
                  <td className="px-4 py-3 text-body">
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
                          comprobante
                        </a>
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${BADGE[o.estado] ?? ""}`}>
                      {o.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(o.created_at).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {o.estado === "pendiente" && (
                      <div className="flex items-center gap-2">
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
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
