"use client";

import { useMemo, useState } from "react";
import { actualizarEstadoCita, alternarPagadoCita } from "@/app/admin/actions";
import { BotonCancelarCita } from "./BotonCancelarCita";
import { toggleDir, sortBy, type SortState } from "@/lib/tablas";
import { filtrarCitas, fechaHora, type Cita, type FiltroEstadoCita } from "./citas-filtros";
import { DetalleCitaModal } from "./DetalleCitaModal";

const selectCls =
  "rounded-[10px] border border-line-2 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand";

const COLUMNS: { key: string; label: string }[] = [
  { key: "fecha", label: "Fecha" },
  { key: "nombre", label: "Nombre" },
  { key: "modalidad", label: "Modalidad" },
  { key: "estado", label: "Estado" },
  { key: "pagado", label: "Pagado" },
];

function accessor(cita: Cita, key: string): string | number {
  switch (key) {
    case "nombre":
      return cita.nombre;
    case "modalidad":
      return cita.modalidad;
    case "estado":
      return cita.estado;
    case "pagado":
      return cita.pagado ? 1 : 0;
    case "fecha":
    default:
      return fechaHora(cita);
  }
}

export function CitasTabla({ citas }: { citas: Cita[] }) {
  const [estado, setEstado] = useState<FiltroEstadoCita>("activas");
  const [modalidad, setModalidad] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "fecha", dir: "asc" });
  const [detalleId, setDetalleId] = useState<string | null>(null);

  // Cita derivada del prop fresco (igual que en CalendarView) para que el modal
  // refleje ediciones/pago tras revalidar sin reabrirlo.
  const detalle = detalleId ? (citas.find((c) => c.id === detalleId) ?? null) : null;

  const filas = useMemo(() => {
    const filtradas = filtrarCitas(citas, { estado, modalidad, q });
    if (!sort) return filtradas;
    return sortBy(filtradas, (c) => accessor(c, sort.key), sort.dir);
  }, [citas, estado, modalidad, q, sort]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value as FiltroEstadoCita)}
          className={selectCls}
        >
          <option value="activas">Confirmadas y pendientes</option>
          <option value="todas">Todas</option>
          <option value="pendiente">Pendiente</option>
          <option value="confirmada">Confirmada</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className={selectCls}>
          <option value="">Todas las modalidades</option>
          <option value="online">Online</option>
          <option value="presencial">Presencial</option>
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre o email…"
          className={`${selectCls} flex-1 min-w-[200px]`}
        />
      </div>

      {filas.length === 0 ? (
        <p className="text-[15px] text-body">No hay citas con esos filtros.</p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
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
                <th className="px-4 py-3 font-normal">Contacto</th>
                <th className="px-4 py-3 font-normal">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setDetalleId(c.id)}
                  className="cursor-pointer border-b border-line transition last:border-0 hover:bg-cream"
                >
                  <td className="px-4 py-3 text-ink">
                    {c.fecha} · {c.hora.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-ink">{c.nombre}</td>
                  <td className="px-4 py-3 text-body">{c.modalidad}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] ${
                        c.estado === "confirmada"
                          ? "bg-brand-tint text-brand-dark"
                          : c.estado === "cancelada"
                            ? "bg-[#f0edeb] text-muted"
                            : "bg-[#fdf3e2] text-[#a87b25]"
                      }`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <form action={alternarPagadoCita}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="pagado" value={String(c.pagado)} />
                      <button
                        type="submit"
                        aria-pressed={c.pagado}
                        className={`rounded-full px-2.5 py-1 text-[12px] transition hover:brightness-95 ${
                          c.pagado ? "bg-brand-tint text-brand-dark" : "bg-[#f0edeb] text-muted"
                        }`}
                      >
                        {c.pagado ? "Pagado" : "No pagado"}
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[c.email, c.telefono].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
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
                        <BotonCancelarCita id={c.id} nombre={c.nombre} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detalle && <DetalleCitaModal cita={detalle} onClose={() => setDetalleId(null)} />}
    </div>
  );
}
