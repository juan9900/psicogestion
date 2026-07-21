"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { actualizarEstadoCita, reagendarCita, crearCitaManual, guardarPagoCita, actualizarDatosCita } from "@/app/admin/actions";
import { citasDelDia, resumenDia, METODOS_PAGO_CITA, etiquetaMetodoPago, type Cita } from "./citas-filtros";
import { Modal } from "./Modal";
import { BotonCancelarCita } from "./BotonCancelarCita";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MAX_VISIBLE = 3;

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function tituloDia(dISO: string) {
  const [y, m, d] = dISO.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${DIAS[dow]} ${d} de ${MESES[m - 1].toLowerCase()}`;
}

const ESTADO_CHIP: Record<string, string> = {
  confirmada: "bg-brand-tint text-brand-dark",
  pendiente: "bg-[#fdf3e2] text-[#a87b25]",
  cancelada: "bg-[#f0edeb] text-muted line-through",
};

const ESTADO_BADGE: Record<string, string> = {
  confirmada: "bg-brand-tint text-brand-dark",
  pendiente: "bg-[#fdf3e2] text-[#a87b25]",
  cancelada: "bg-[#f0edeb] text-muted",
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

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[12px] ${ESTADO_BADGE[estado] ?? "bg-cream text-body"}`}>
      {estado}
    </span>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function BotonSubmit({ deshabilitado, texto = "Guardar" }: { deshabilitado?: boolean; texto?: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || deshabilitado}
      className="flex min-w-[104px] items-center justify-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[12px] font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
    >
      {pending && <Spinner />}
      {pending ? "Guardando…" : texto}
    </button>
  );
}

const campoCls =
  "rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand";

export function EdicionCita({ cita }: { cita: Cita }) {
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <div className="grid gap-1.5">
        <div className="text-[13px] text-body">
          {cita.modalidad}
          {[cita.email, cita.telefono].some(Boolean) && " · "}
          {[cita.email, cita.telefono].filter(Boolean).join(" · ")}
        </div>
        {cita.motivo && <div className="text-[13px] text-muted">{cita.motivo}</div>}
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="justify-self-start rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body transition hover:bg-cream"
        >
          Editar datos
        </button>
      </div>
    );
  }

  return (
    <form action={actualizarDatosCita} className="grid gap-2 rounded-[10px] border border-line bg-cream/60 p-3">
      <input type="hidden" name="id" value={cita.id} />
      <label className="grid gap-1 text-[12px] text-muted">
        Nombre
        <input type="text" name="nombre" defaultValue={cita.nombre} required className={campoCls} />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Modalidad
        <select name="modalidad" defaultValue={cita.modalidad} className={campoCls}>
          <option value="online">Online</option>
          <option value="presencial">Presencial</option>
        </select>
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Email
        <input type="email" name="email" defaultValue={cita.email ?? ""} className={campoCls} />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Teléfono
        <input type="tel" name="telefono" defaultValue={cita.telefono ?? ""} className={campoCls} />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Motivo
        <textarea name="motivo" rows={2} defaultValue={cita.motivo ?? ""} className={campoCls} />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body transition hover:bg-cream"
        >
          Cancelar
        </button>
        <BotonSubmit texto="Guardar datos" />
      </div>
    </form>
  );
}

function AccionesCita({ cita }: { cita: Cita }) {
  const [reagendando, setReagendando] = useState(false);
  const horaOriginal = cita.hora.slice(0, 5);
  const [fecha, setFecha] = useState(cita.fecha);
  const [hora, setHora] = useState(horaOriginal);
  const sinCambios = fecha === cita.fecha && hora === horaOriginal;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {cita.estado === "pendiente" && (
          <form action={actualizarEstadoCita}>
            <input type="hidden" name="id" value={cita.id} />
            <input type="hidden" name="estado" value="confirmada" />
            <button className="rounded-full bg-brand px-3 py-1.5 text-[12px] font-medium text-white hover:brightness-110">
              Confirmar
            </button>
          </form>
        )}
        {cita.estado !== "cancelada" && (
          <BotonCancelarCita id={cita.id} nombre={cita.nombre} />
        )}
        <button
          onClick={() => setReagendando((v) => !v)}
          className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body hover:bg-cream"
        >
          Reagendar
        </button>
      </div>

      {reagendando && (
        <form action={reagendarCita} className="flex flex-wrap items-end gap-2 rounded-[10px] border border-line bg-cream/60 p-3">
          <input type="hidden" name="id" value={cita.id} />
          <label className="grid gap-1 text-[12px] text-muted">
            Fecha
            <input
              type="date"
              name="fecha"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
            />
          </label>
          <label className="grid gap-1 text-[12px] text-muted">
            Hora
            <input
              type="time"
              name="hora"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              required
              className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
            />
          </label>
          <BotonSubmit deshabilitado={sinCambios} />
        </form>
      )}
    </div>
  );
}

function SeccionPago({ cita }: { cita: Cita }) {
  return (
    <div className="grid gap-2 rounded-[10px] border border-line bg-cream/60 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink">
          Pago
          {(cita.monto || cita.metodo_pago) && (
            <span className="ml-1.5 font-normal text-muted">
              {cita.monto != null ? `· $${cita.monto} ` : ""}
              {cita.metodo_pago ? `· ${etiquetaMetodoPago(cita.metodo_pago)}` : ""}
            </span>
          )}
        </span>
        {cita.pagado && (
          <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[12px] text-brand-dark">Pagado</span>
        )}
      </div>
      <form action={guardarPagoCita} className="grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="id" value={cita.id} />
        <label className="grid gap-1 text-[12px] text-muted">
          Monto
          <div className="flex items-center gap-1 rounded-[8px] border border-line-2 bg-white px-2 py-1.5 focus-within:border-brand">
            <span className="text-[13px] text-muted">$</span>
            <input
              type="number"
              name="monto"
              step="0.01"
              min="0"
              defaultValue={cita.monto ?? ""}
              placeholder="0.00"
              className="w-full text-[13px] text-ink outline-none"
            />
          </div>
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Método
          <select
            name="metodo_pago"
            defaultValue={cita.metodo_pago ?? ""}
            className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
          >
            <option value="">Sin especificar</option>
            {METODOS_PAGO_CITA.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-full flex items-center gap-2 text-[13px] text-ink">
          <input type="checkbox" name="pagado" defaultChecked={cita.pagado} className="h-4 w-4 rounded border-line-2 accent-brand" />
          Marcado como pagado
        </label>
        <div className="col-span-full">
          <BotonSubmit />
        </div>
      </form>
    </div>
  );
}

function FormularioNuevaCita() {
  return (
    <form action={crearCitaManual} className="grid gap-3">
      <label className="grid gap-1 text-[12px] text-muted">
        Nombre
        <input
          type="text"
          name="nombre"
          required
          className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="grid gap-1 text-[12px] text-muted">
          Fecha
          <input
            type="date"
            name="fecha"
            required
            className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Hora
          <input
            type="time"
            name="hora"
            required
            className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
          />
        </label>
      </div>
      <label className="grid gap-1 text-[12px] text-muted">
        Modalidad
        <select
          name="modalidad"
          defaultValue="online"
          className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
        >
          <option value="online">Online</option>
          <option value="presencial">Presencial</option>
        </select>
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Email
        <input
          type="email"
          name="email"
          className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
        />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Teléfono
        <input
          type="tel"
          name="telefono"
          className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
        />
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Motivo
        <textarea
          name="motivo"
          rows={2}
          className="rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand"
        />
      </label>
      <BotonSubmit texto="Agendar" />
    </form>
  );
}

export function CalendarView({ citas }: { citas: Cita[] }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());

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
      <div className="flex justify-end">
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
            const { visibles, extra } = resumenDia(citas, dISO, MAX_VISIBLE);
            return (
              <button
                key={i}
                onClick={() => setDiaModal(dISO)}
                className="flex min-h-[92px] min-w-0 flex-col items-stretch gap-1 rounded-[10px] border border-line bg-white p-1.5 text-left transition hover:border-brand"
              >
                <span className={`px-0.5 text-[12px] ${isToday ? "font-semibold text-brand" : "text-ink"}`}>{d}</span>
                <div className="grid min-w-0 gap-0.5">
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
              </button>
            );
          })}
        </div>
      </div>

      {diaModal && (
        <Modal titulo={tituloDia(diaModal)} onClose={() => setDiaModal(null)} maxAlto>
          {citasDelDia(citas, diaModal).length === 0 ? (
            <p className="text-[14px] text-body">Sin citas este día.</p>
          ) : (
            <div className="grid gap-2">
              {citasDelDia(citas, diaModal).map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setDiaModal(null);
                    abrirDetalle(c);
                  }}
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

      {detalle && (
        <Modal titulo={detalle.nombre} onClose={() => setDetalleId(null)}>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <div className="font-serif text-[17px] text-ink">
                {tituloDia(detalle.fecha)} · {detalle.hora.slice(0, 5)}
              </div>
              <EstadoBadge estado={detalle.estado} />
            </div>
            <EdicionCita cita={detalle} />
            <AccionesCita cita={detalle} />
            <SeccionPago cita={detalle} />
          </div>
        </Modal>
      )}

      {nuevoAbierto && (
        <Modal titulo="Agendar cita" onClose={() => setNuevoAbierto(false)} maxAlto>
          <FormularioNuevaCita />
        </Modal>
      )}
    </div>
  );
}
