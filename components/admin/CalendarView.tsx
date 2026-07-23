"use client";

import { useState } from "react";
import { crearCitaManual } from "@/app/admin/actions";
import {
  citasDelDia,
  resumenDia,
  tituloDia,
  DIAS,
  MESES,
  TIPOS_CITA,
  METODOS_PAGO_CITA,
  type Cita,
  type Bloqueo,
} from "./citas-filtros";
import { Modal } from "./Modal";
import { DetalleCitaModal, EstadoBadge } from "./DetalleCitaModal";
import { BloqueosDia } from "./BloqueosDia";

const MAX_VISIBLE = 3;

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Siguiente día de una fecha ISO ("yyyy-mm-dd"), en horario local (sin UTC).
const sumarDia = (dISO: string) => {
  const [y, m, d] = dISO.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return iso(next.getFullYear(), next.getMonth(), next.getDate());
};

const ESTADO_CHIP: Record<string, string> = {
  confirmada: "bg-brand-tint text-brand-dark",
  pendiente: "bg-[#fdf3e2] text-[#a87b25]",
  cancelada: "bg-[#f0edeb] text-muted line-through",
};

function IconoEstado({ estado }: { estado: string }) {
  if (estado === "confirmada") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
        <path d="M4 12l5 5L20 6" />
      </svg>
    );
  }
  if (estado === "cancelada") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="flex-none">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    );
  }
  return <span className="h-[7px] w-[7px] flex-none rounded-full bg-current" />;
}

function IconoPersona() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-none opacity-70">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.5-4 5-6 7.5-6s6 2 7.5 6" />
    </svg>
  );
}

function IconoPago() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="flex-none">
      <path d="M12 2.5v19M16.5 6.8c0-1.8-2-3.3-4.5-3.3s-4.5 1.4-4.5 3.2c0 1.9 2 2.7 4.5 3.3s4.5 1.5 4.5 3.3c0 1.8-2 3.2-4.5 3.2s-4.5-1.5-4.5-3.3" />
    </svg>
  );
}

function ChipCita({ cita, onClick }: { cita: Cita; onClick: () => void }) {
  const mostrarIconos = cita.pagado || cita.modalidad === "presencial";
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`flex w-full min-w-0 items-center gap-1 overflow-hidden rounded-[6px] px-1.5 py-[3px] text-left text-[11px] leading-tight transition hover:brightness-95 ${ESTADO_CHIP[cita.estado] ?? "bg-cream text-body"}`}
    >
      <IconoEstado estado={cita.estado} />
      <span className="flex-none">{cita.hora.slice(0, 5)}</span>
      <span className="min-w-0 truncate">{cita.nombre}</span>
      {mostrarIconos && (
        <span className="ml-auto flex flex-none items-center gap-1">
          {cita.pagado && <IconoPago />}
          {cita.modalidad === "presencial" && <IconoPersona />}
        </span>
      )}
    </button>
  );
}

const campoNueva =
  "rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand";

// Alta manual: submit controlado (no `action={...}`) para poder cerrar el modal
// al crear con éxito. Sigue el patrón de RecursoForm (FormData + try/catch).
function FormularioNuevaCita({ onCreada, duracionDefault }: { onCreada: () => void; duracionDefault: number }) {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await crearCitaManual(new FormData(e.currentTarget));
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agendar la cita.");
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label className="grid gap-1 text-[12px] text-muted">
        Nombre
        <input type="text" name="nombre" required className={campoNueva} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[12px] text-muted">
          Fecha
          <input type="date" name="fecha" required className={campoNueva} />
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Hora
          <input type="time" name="hora" required className={campoNueva} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[12px] text-muted">
          Tipo
          <select name="tipo" defaultValue="consulta" className={campoNueva}>
            {TIPOS_CITA.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Modalidad
          <select name="modalidad" defaultValue="online" className={campoNueva}>
            <option value="online">Online</option>
            <option value="presencial">Presencial</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-[12px] text-muted">
        Duración (min)
        <input
          type="number"
          name="duracion_min"
          min={5}
          max={480}
          step={5}
          defaultValue={duracionDefault}
          className={campoNueva}
        />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Email
        <input type="email" name="email" className={campoNueva} />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Teléfono
        <input type="tel" name="telefono" className={campoNueva} />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Motivo
        <textarea name="motivo" rows={2} className={campoNueva} />
      </label>

      {/* Pago (opcional): se puede registrar de una vez al crear la cita. */}
      <div className="grid gap-2 rounded-[10px] border border-line bg-cream/60 p-3">
        <span className="text-[12px] font-medium text-ink">Pago (opcional)</span>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-[12px] text-muted">
            Monto
            <div className="flex items-center gap-1 rounded-[8px] border border-line-2 bg-white px-2 py-1.5 focus-within:border-brand">
              <span className="text-[13px] text-muted">$</span>
              <input
                type="number"
                name="monto"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="w-full text-[13px] text-ink outline-none"
              />
            </div>
          </label>
          <label className="grid gap-1 text-[12px] text-muted">
            Método
            <select name="metodo_pago" defaultValue="" className={campoNueva}>
              <option value="">Sin especificar</option>
              {METODOS_PAGO_CITA.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.etiqueta}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" name="pagado" className="h-4 w-4 rounded border-line-2 accent-brand" />
          Marcado como pagado
        </label>
      </div>

      {error && <p className="text-[13px] text-[#a33]">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="flex min-w-[104px] items-center justify-center gap-1.5 justify-self-start rounded-full bg-brand px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enviando ? "Agendando…" : "Agendar"}
      </button>
    </form>
  );
}

export function CalendarView({
  citas,
  bloqueos = [],
  duracionDefault = 60,
}: {
  citas: Cita[];
  bloqueos?: Bloqueo[];
  duracionDefault?: number;
}) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());

  // Marcado de días bloqueados en la grilla. Un bloqueo de día completo (sin
  // franja horaria) tiñe cada fecha de su rango [fecha, fecha_fin]; uno de rango
  // de horas se marca como "parcial" (indicador más tenue).
  const bloqueoPorFecha = new Map<string, string | null>(); // día completo -> motivo
  const parcialPorFecha = new Set<string>(); // rango de horas
  for (const b of bloqueos) {
    const completo = !b.hora_inicio && !b.hora_fin;
    let d = b.fecha;
    const fin = b.fecha_fin ?? b.fecha;
    // Expande el rango de fechas (se asume rangos acotados, típicos de vacaciones).
    while (d <= fin) {
      if (completo) bloqueoPorFecha.set(d, b.motivo);
      else parcialPorFecha.add(d);
      d = sumarDia(d);
    }
  }

  const [diaModal, setDiaModal] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [nuevoAbierto, setNuevoAbierto] = useState(false);

  // Derivar la cita del prop fresco (no guardar el objeto) para que el modal
  // refleje ediciones/pago/reagendado tras revalidar, sin tener que reabrir.
  const detalle = detalleId ? (citas.find((c) => c.id === detalleId) ?? null) : null;

  const firstDow = new Date(cur.y, cur.m, 1).getDay();
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setCur(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const next = () => setCur(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  const abrirDetalle = (cita: Cita) => setDetalleId(cita.id);

  return (
    <div className="grid gap-5">
      <div className="flex justify-end gap-2">
        <BloqueosDia bloqueos={bloqueos} />
        <button
          onClick={() => setNuevoAbierto(true)}
          className="rounded-full bg-brand px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-110"
        >
          + Agendar
        </button>
      </div>

      <div className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={prev}
            aria-label="Mes anterior"
            className="h-8 w-8 rounded-full border border-line-2 text-body transition hover:bg-cream"
          >
            ←
          </button>
          <div className="font-serif text-[19px] text-ink">
            {MESES[cur.m]} {cur.y}
          </div>
          <button
            onClick={next}
            aria-label="Mes siguiente"
            className="h-8 w-8 rounded-full border border-line-2 text-body transition hover:bg-cream"
          >
            →
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
          {DIAS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dISO = iso(cur.y, cur.m, d);
            const isToday = dISO === todayIso;
            const bloqueado = bloqueoPorFecha.has(dISO);
            const motivoBloqueo = bloqueoPorFecha.get(dISO);
            const parcial = !bloqueado && parcialPorFecha.has(dISO);
            const { visibles, extra } = resumenDia(citas, dISO, MAX_VISIBLE);
            const total = visibles.length + extra;
            return (
              <button
                key={i}
                onClick={() => setDiaModal(dISO)}
                title={
                  bloqueado
                    ? `Bloqueado${motivoBloqueo ? `: ${motivoBloqueo}` : ""}`
                    : parcial
                      ? "Tiene horas bloqueadas"
                      : undefined
                }
                className={`flex min-h-[56px] min-w-0 flex-col items-stretch gap-1 rounded-[10px] border p-1.5 text-left transition hover:border-brand sm:min-h-[92px] xl:min-h-[110px] ${
                  bloqueado ? "border-line bg-[#f4efe6]" : "border-line bg-white"
                }`}
              >
                <span className={`px-0.5 text-[12px] ${isToday ? "font-semibold text-brand" : bloqueado ? "text-muted" : "text-ink"}`}>
                  {d}
                </span>
                {bloqueado && (
                  <span className="px-0.5 text-[10px] leading-tight text-muted">🚫 {motivoBloqueo || "Bloqueado"}</span>
                )}
                {parcial && (
                  <span className="px-0.5 text-[10px] leading-tight text-muted">⛔ horas bloqueadas</span>
                )}

                {/* Escritorio: chips con detalle de cada cita */}
                <div className="hidden min-w-0 gap-0.5 sm:grid">
                  {visibles.map((c) => (
                    <ChipCita key={c.id} cita={c} onClick={() => abrirDetalle(c)} />
                  ))}
                  {extra > 0 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiaModal(dISO);
                      }}
                      className="px-1.5 text-[11px] text-muted hover:text-ink"
                    >
                      +{extra} más
                    </span>
                  )}
                </div>

                {/* Móvil: solo un punto + el número de citas (tocar el día abre el modal) */}
                {total > 0 && (
                  <div className="flex items-center gap-1 px-0.5 sm:hidden">
                    <span className="h-2 w-2 flex-none rounded-full bg-brand" />
                    <span className="text-[12px] text-body">{total}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Modal del día: se oculta mientras hay un detalle abierto encima, y
          reaparece al cerrar el detalle (navegación "volver atrás"). */}
      {diaModal && !detalle && (
        <Modal titulo={tituloDia(diaModal)} onClose={() => setDiaModal(null)} maxAlto>
          {citasDelDia(citas, diaModal).length === 0 ? (
            <p className="text-[14px] text-body">Sin citas este día.</p>
          ) : (
            <div className="grid gap-2">
              {citasDelDia(citas, diaModal).map((c) => (
                <button
                  key={c.id}
                  onClick={() => abrirDetalle(c)}
                  className="flex w-full items-center gap-3 rounded-[10px] border border-line p-2.5 text-left transition hover:border-brand"
                >
                  <div className="w-[52px] flex-none font-serif text-[15px] text-brand">{c.hora.slice(0, 5)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-ink">{c.nombre}</div>
                    <div className="text-[12px] text-muted">{c.modalidad}</div>
                  </div>
                  <EstadoBadge estado={c.estado} />
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}

      {detalle && <DetalleCitaModal cita={detalle} onClose={() => setDetalleId(null)} />}

      {nuevoAbierto && (
        <Modal titulo="Agendar cita" onClose={() => setNuevoAbierto(false)} maxAlto>
          <FormularioNuevaCita onCreada={() => setNuevoAbierto(false)} duracionDefault={duracionDefault} />
        </Modal>
      )}
    </div>
  );
}
