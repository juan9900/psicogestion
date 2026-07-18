"use client";

import { useState } from "react";
import { actualizarEstadoCita } from "@/app/admin/actions";

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

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function tituloDia(dISO: string) {
  const [y, m, d] = dISO.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${DIAS[dow]} ${d} de ${MESES[m - 1].toLowerCase()}`;
}

export function CalendarView({ citas }: { citas: Cita[] }) {
  const now = new Date();
  const [cur, setCur] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const todayIso = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const [sel, setSel] = useState<string | null>(todayIso);

  const byDay = new Map<string, Cita[]>();
  for (const c of citas) {
    const arr = byDay.get(c.fecha) ?? [];
    arr.push(c);
    byDay.set(c.fecha, arr);
  }

  const firstDow = new Date(cur.y, cur.m, 1).getDay();
  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setCur(({ y, m }) => (m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 }));
  const next = () => setCur(({ y, m }) => (m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 }));

  const selCitas = sel
    ? (byDay.get(sel) ?? []).slice().sort((a, b) => a.hora.localeCompare(b.hora))
    : [];

  return (
    <div className="grid gap-5">
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
            const count = byDay.get(dISO)?.length ?? 0;
            const isToday = dISO === todayIso;
            const isSel = dISO === sel;
            return (
              <button
                key={i}
                onClick={() => setSel(dISO)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-[10px] border text-[13px] transition ${
                  isSel
                    ? "border-brand bg-brand-tint"
                    : "border-line bg-white hover:border-brand"
                }`}
              >
                <span className={isToday ? "font-semibold text-brand" : "text-ink"}>{d}</span>
                {count > 0 && (
                  <span className="min-w-[16px] rounded-full bg-brand px-1 text-[10px] font-medium leading-[15px] text-white">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-3 font-serif text-[18px] text-ink">
          {sel ? tituloDia(sel) : "Selecciona un día"}
        </h3>
        {selCitas.length === 0 ? (
          <p className="text-[14px] text-body">Sin citas este día.</p>
        ) : (
          <div className="grid gap-2">
            {selCitas.map((c) => (
              <div key={c.id} className="rounded-[12px] border border-line bg-white p-3 sm:flex sm:items-center sm:gap-4">
                <div className="w-[70px] flex-none font-serif text-[17px] text-brand">
                  {c.hora.slice(0, 5)}
                </div>
                <div className="mt-1 flex-1 sm:mt-0">
                  <div className="text-[15px] text-ink">
                    {c.nombre}{" "}
                    <span className="text-[13px] text-muted">· {c.modalidad}</span>
                  </div>
                  <div className="text-[13px] text-body">
                    {[c.email, c.telefono].filter(Boolean).join(" · ") || "—"}
                  </div>
                  {c.motivo && <div className="mt-0.5 text-[13px] text-muted">{c.motivo}</div>}
                </div>
                <div className="mt-2 flex items-center gap-2 sm:mt-0">
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
      </div>
    </div>
  );
}
