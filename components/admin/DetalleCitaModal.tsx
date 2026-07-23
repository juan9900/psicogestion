"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { actualizarEstadoCita, reagendarCita, guardarPagoCita, actualizarDatosCita } from "@/app/admin/actions";
import {
  METODOS_PAGO_CITA,
  etiquetaMetodoPago,
  TIPOS_CITA,
  etiquetaTipoCita,
  horaFin,
  tituloDia,
  type Cita,
} from "./citas-filtros";
import { Modal } from "./Modal";
import { BotonCancelarCita } from "./BotonCancelarCita";

// Modal de detalle de una cita, compartido por el calendario (CalendarView) y
// la tabla (CitasTabla). Reúne edición de datos, acciones (confirmar/cancelar/
// reagendar) y la gestión de pago. Antes vivía inline dentro de CalendarView;
// se extrajo para reutilizarlo desde la tabla sin duplicar el formulario.
//
// Nota de dependencias: este archivo NO importa de CalendarView (evita ciclos);
// CalendarView importa de aquí (DetalleCitaModal, EstadoBadge, EdicionCita,
// BotonSubmit).

const ESTADO_BADGE: Record<string, string> = {
  confirmada: "bg-brand-tint text-brand-dark",
  pendiente: "bg-[#fdf3e2] text-[#a87b25]",
  cancelada: "bg-[#f0edeb] text-muted",
};

export function EstadoBadge({ estado }: { estado: string }) {
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

export function BotonSubmit({ deshabilitado, texto = "Guardar" }: { deshabilitado?: boolean; texto?: string }) {
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
          {etiquetaTipoCita(cita.tipo)} · {cita.modalidad}
          {[cita.email, cita.telefono].some(Boolean) && " · "}
          {[cita.email, cita.telefono].filter(Boolean).join(" · ")}
        </div>
        {cita.ubicacion && <div className="text-[13px] text-muted">📍 {cita.ubicacion}</div>}
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
        Tipo
        <select name="tipo" defaultValue={cita.tipo || "consulta"} className={campoCls}>
          {TIPOS_CITA.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.etiqueta}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Modalidad
        <select name="modalidad" defaultValue={cita.modalidad} className={campoCls}>
          <option value="online">Online</option>
          <option value="presencial">Presencial</option>
        </select>
      </label>
      <label className="grid gap-1 text-[12px] text-muted">
        Duración (min)
        <input type="number" name="duracion_min" min={5} max={480} step={5} defaultValue={cita.duracion_min} className={campoCls} />
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

/** Modal de detalle completo de una cita: edición, acciones y pago. */
export function DetalleCitaModal({ cita, onClose }: { cita: Cita; onClose: () => void }) {
  return (
    <Modal titulo={cita.nombre} onClose={onClose} maxAlto>
      <div className="grid gap-3">
        <div className="flex items-center justify-between">
          <div className="font-serif text-[17px] text-ink">
            {tituloDia(cita.fecha)} · {cita.hora.slice(0, 5)}–{horaFin(cita.hora, cita.duracion_min)}
            <span className="ml-1 text-[13px] font-normal text-muted">({cita.duracion_min} min)</span>
          </div>
          <EstadoBadge estado={cita.estado} />
        </div>
        <EdicionCita cita={cita} />
        <AccionesCita cita={cita} />
        <SeccionPago cita={cita} />
      </div>
    </Modal>
  );
}
