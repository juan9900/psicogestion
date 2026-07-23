"use client";

import { useState } from "react";
import { bloquearDia, desbloquearDia } from "@/app/admin/actions";
import { tituloDia, type Bloqueo } from "./citas-filtros";
import { Modal } from "./Modal";

const campo =
  "rounded-[8px] border border-line-2 bg-white px-2 py-1.5 text-[13px] text-ink outline-none focus:border-brand";

// Descripción legible de un bloqueo (rango de fechas + horas si aplica).
function descripcionBloqueo(b: Bloqueo): string {
  const fechas = b.fecha_fin && b.fecha_fin !== b.fecha
    ? `${tituloDia(b.fecha)} → ${tituloDia(b.fecha_fin)}`
    : tituloDia(b.fecha);
  const horas = b.hora_inicio && b.hora_fin
    ? ` · ${b.hora_inicio.slice(0, 5)}–${b.hora_fin.slice(0, 5)}`
    : " · todo el día";
  return fechas + horas;
}

// Gestión de bloqueos de la agenda: un día, un rango de días, o solo un rango de
// horas. Bloquear saca esas fechas/horas del sitio público automáticamente
// (horarios_disponibles excluye dias_bloqueados). Submit controlado para cerrar
// el modal al crear con éxito (patrón RecursoForm).
export function BloqueosDia({ bloqueos }: { bloqueos: Bloqueo[] }) {
  const [abierto, setAbierto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [todoElDia, setTodoElDia] = useState(true);

  const hoy = new Date().toISOString().slice(0, 10);
  const futuros = bloqueos.filter((b) => (b.fecha_fin ?? b.fecha) >= hoy);

  async function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await bloquearDia(new FormData(e.currentTarget));
      setAbierto(false);
      setTodoElDia(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo bloquear.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="rounded-full border border-line-2 px-4 py-2 text-[13px] font-medium text-body transition hover:bg-cream"
      >
        Bloquear horario
      </button>

      {abierto && (
        <Modal titulo="Bloquear horario" onClose={() => setAbierto(false)} maxAlto>
          <form onSubmit={crear} className="grid gap-3">
            <p className="text-[13px] text-body">
              Las fechas u horas bloqueadas dejan de ofrecerse en el sitio (feriado, vacaciones, etc.).
            </p>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-[12px] text-muted">
                Desde
                <input type="date" name="fecha" required className={campo} />
              </label>
              <label className="grid gap-1 text-[12px] text-muted">
                Hasta (opcional)
                <input type="date" name="fecha_fin" className={campo} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-ink">
              <input
                type="checkbox"
                name="todo_el_dia"
                checked={todoElDia}
                onChange={(e) => setTodoElDia(e.target.checked)}
                className="h-4 w-4 rounded border-line-2 accent-brand"
              />
              Todo el día
            </label>
            {!todoElDia && (
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-[12px] text-muted">
                  Hora inicio
                  <input type="time" name="hora_inicio" required={!todoElDia} className={campo} />
                </label>
                <label className="grid gap-1 text-[12px] text-muted">
                  Hora fin
                  <input type="time" name="hora_fin" required={!todoElDia} className={campo} />
                </label>
              </div>
            )}
            <label className="grid gap-1 text-[12px] text-muted">
              Motivo (opcional)
              <input type="text" name="motivo" placeholder="Feriado, viaje…" className={campo} />
            </label>
            {error && <p className="text-[13px] text-[#a33]">{error}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="justify-self-start rounded-full bg-brand px-4 py-2 text-[13px] font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enviando ? "Bloqueando…" : "Bloquear"}
            </button>
          </form>

          {futuros.length > 0 && (
            <div className="mt-5 border-t border-line pt-4">
              <h3 className="mb-2 text-[13px] font-medium text-ink">Bloqueos vigentes</h3>
              <div className="grid gap-2">
                {futuros.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 rounded-[10px] border border-line p-2.5 text-[13px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-ink">{descripcionBloqueo(b)}</div>
                      {b.motivo && <div className="truncate text-[12px] text-muted">{b.motivo}</div>}
                    </div>
                    <form action={desbloquearDia}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body transition hover:bg-cream">
                        Quitar
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
