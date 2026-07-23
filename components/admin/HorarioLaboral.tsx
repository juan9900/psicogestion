"use client";

import { useState } from "react";
import { agregarFranja, eliminarFranja } from "@/app/admin/actions";
import { DIAS, MODALIDADES_FRANJA } from "./citas-filtros";

export type Franja = {
  id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  modalidad: string | null;
};

// Orden de la semana empezando en lunes (más natural para horario laboral).
const DIAS_ORDEN = [1, 2, 3, 4, 5, 6, 0];

const campo =
  "rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand";

function etiquetaModalidad(m: string | null): string {
  return MODALIDADES_FRANJA.find((x) => x.valor === (m ?? ""))?.etiqueta ?? "Ambas";
}

export function HorarioLaboral({ franjas }: { franjas: Franja[] }) {
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const porDia = (d: number) =>
    franjas
      .filter((f) => f.dia_semana === d)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

  async function agregar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const form = e.currentTarget;
    try {
      await agregarFranja(new FormData(form));
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo agregar la franja.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {DIAS_ORDEN.map((d) => {
          const lista = porDia(d);
          return (
            <div key={d} className="grid grid-cols-[80px_1fr] items-start gap-3 rounded-[12px] border border-line bg-white p-3">
              <div className="pt-1 text-[13px] font-medium text-ink">{DIAS[d]}</div>
              <div className="flex flex-wrap gap-2">
                {lista.length === 0 ? (
                  <span className="text-[13px] text-muted">Sin horario (no laborable)</span>
                ) : (
                  lista.map((f) => (
                    <span
                      key={f.id}
                      className="flex items-center gap-2 rounded-full border border-line-2 bg-cream/60 py-1 pl-3 pr-1 text-[12px] text-body"
                    >
                      {f.hora_inicio.slice(0, 5)}–{f.hora_fin.slice(0, 5)}
                      <span className="text-muted">· {etiquetaModalidad(f.modalidad)}</span>
                      <form action={eliminarFranja}>
                        <input type="hidden" name="id" value={f.id} />
                        <button
                          aria-label="Quitar franja"
                          className="grid h-5 w-5 place-items-center rounded-full text-muted transition hover:bg-line hover:text-ink"
                        >
                          ✕
                        </button>
                      </form>
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Agregar franja */}
      <form onSubmit={agregar} className="grid gap-2 rounded-[12px] border border-line bg-white p-3 sm:grid-cols-[1fr_auto_auto_1fr_auto] sm:items-end">
        <label className="grid gap-1 text-[12px] text-muted">
          Día
          <select name="dia_semana" defaultValue="1" className={campo}>
            {DIAS_ORDEN.map((d) => (
              <option key={d} value={d}>
                {DIAS[d]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Desde
          <input type="time" name="hora_inicio" required className={campo} />
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Hasta
          <input type="time" name="hora_fin" required className={campo} />
        </label>
        <label className="grid gap-1 text-[12px] text-muted">
          Modalidad
          <select name="modalidad" defaultValue="" className={campo}>
            {MODALIDADES_FRANJA.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={enviando}
          className="rounded-full bg-brand px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? "Agregando…" : "Agregar"}
        </button>
      </form>
      {error && <p className="text-[13px] text-[#a33]">{error}</p>}
    </div>
  );
}
