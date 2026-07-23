"use client";

import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CANALES } from "@/lib/site";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const DAYNAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Day = {
  key: string; // ISO yyyy-mm-dd — identidad estable
  dow: string; // abreviatura día
  num: number; // día del mes
  month: number; // 0-11
};

type Modalidad = "Online" | "Presencial";

// Próximos N días hábiles (lun–vie) a partir de hoy. Dinámico: sin fines de
// semana ni fechas pasadas. Se calcula en el cliente para evitar desajustes de
// hidratación (depende de la fecha/hora actual).
function upcomingBusinessDays(count: number): Day[] {
  const out: Day[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (out.length < count) {
    const dw = d.getDay();
    if (dw !== 0 && dw !== 6) {
      const y = d.getFullYear();
      const m = d.getMonth();
      const day = d.getDate();
      out.push({
        key: `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        dow: DAYNAMES[dw],
        num: day,
        month: m,
      });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function BookingSection() {
  const [step, setStep] = useState(0);
  const [modalidad, setModalidad] = useState<Modalidad>("Online");
  const [dateKey, setDateKey] = useState<string>("");
  const [time, setTime] = useState("");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [motivo, setMotivo] = useState("");
  const [canal, setCanal] = useState("");
  const [sent, setSent] = useState(false);

  // Horas disponibles reales para el día elegido. Se piden a Supabase
  // (horarios_disponibles) para reflejar el horario laboral, los bloqueos y las
  // horas ya ocupadas — así crear_cita nunca rechaza el slot seleccionado.
  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contador de peticiones: descarta respuestas de un día ya no seleccionado
  // (evita que un clic rápido A→B muestre las horas de A).
  const reqRef = useRef(0);

  // Al elegir un día pedimos sus horas reales a Supabase. Se hace aquí (en el
  // manejador del clic), no en un efecto, porque es una reacción a la acción del
  // usuario: refleja horario laboral, bloqueos y horas ya ocupadas.
  const seleccionarDia = (key: string) => {
    setDateKey(key);
    setTime("");
    setError(null);
    setTimes([]);
    setLoadingTimes(true);
    const req = ++reqRef.current;
    const supabase = createClient();
    supabase
      .rpc("horarios_disponibles", { p_fecha: key })
      .then(({ data, error: rpcError }) => {
        if (req !== reqRef.current) return; // respuesta obsoleta
        if (rpcError) {
          setTimes([]);
          setError("No pudimos cargar las horas. Inténtalo de nuevo.");
        } else {
          const filas = (data ?? []) as { hora: string }[];
          setTimes(filas.map((r) => r.hora.slice(0, 5)));
        }
        setLoadingTimes(false);
      });
  };

  // Inicializador perezoso: las píldoras de día solo se muestran en el paso 1
  // (post-hidratación), así que calcular con la fecha actual no provoca
  // desajustes de hidratación en el render inicial (paso 0).
  const [days] = useState<Day[]>(() => upcomingBusinessDays(8));

  const selectedDay = useMemo(
    () => days.find((d) => d.key === dateKey) ?? null,
    [days, dateKey],
  );

  const dateLabel = selectedDay
    ? `${selectedDay.num} de ${MONTHS[selectedDay.month]}`
    : "—";
  const summary =
    selectedDay && time
      ? `${dateLabel} · ${time} · ${modalidad}`
      : "Selecciona día y hora";

  const valid = (s: number) =>
    s === 0 ? true : s === 1 ? !!(dateKey && time) : true;
  const canConfirm = !!(dateKey && time && nombre.trim());

  const next = () => valid(step) && setStep((s) => Math.min(2, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const confirm = async () => {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("crear_cita", {
      p_fecha: dateKey,
      p_hora: time,
      p_modalidad: modalidad.toLowerCase(), // enum en BD: 'online' | 'presencial'
      p_nombre: nombre.trim(),
      p_email: email.trim() || null,
      p_telefono: tel.trim() || null,
      p_motivo: motivo.trim() || null,
      p_canal: canal || null,
    });
    setSubmitting(false);
    if (rpcError) {
      // Mensaje del backend cuando el slot ya no está libre; genérico si no.
      setError(
        /disponible|tomada/i.test(rpcError.message)
          ? "Esa hora ya no está disponible. Elige otra, por favor."
          : "No se pudo agendar la cita. Inténtalo de nuevo.",
      );
      return;
    }
    setSent(true);
  };

  const reset = () => {
    setSent(false);
    setStep(0);
    setModalidad("Online");
    setDateKey("");
    setTime("");
    setTimes([]);
    setNombre("");
    setEmail("");
    setTel("");
    setMotivo("");
    setCanal("");
    setError(null);
  };

  return (
    <section id="agendar" className="bg-sand">
      <div className="mx-auto max-w-[1120px] px-6 py-[72px] sm:px-10">
        <div className="mx-auto mb-[34px] max-w-[620px] text-center">
          <h2 className="mb-2.5 font-serif text-[38px] font-normal">
            Agenda tu hora
          </h2>
          <p className="text-[16px] text-body">
            Reserva tu consulta presencial o tu sesión online.
            Responde tres preguntas y te confirmaré tu cita por correo.
          </p>
        </div>

        {!sent ? (
          <div className="mx-auto max-w-[640px] rounded-[20px] border border-line bg-white p-6 sm:p-11">
            {/* Indicador de progreso */}
            <div className="mb-9 flex gap-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 rounded-full transition-all duration-200"
                  style={{
                    width: step === i ? 28 : 8,
                    background: step >= i ? "#3f8f79" : "#e0d8cc",
                  }}
                />
              ))}
            </div>

            {/* Paso 0 — Modalidad */}
            {step === 0 && (
              <div>
                <div className="mb-[26px] font-serif text-[30px] leading-[1.15]">
                  ¿Cómo prefieres tu sesión?
                </div>
                <div className="flex flex-col gap-[14px] sm:flex-row">
                  <ModalidadCard
                    title="Online"
                    desc="Por videollamada, desde donde estés."
                    active={modalidad === "Online"}
                    onClick={() => setModalidad("Online")}
                  />
                  <ModalidadCard
                    title="Presencial"
                    desc="En consulta, cara a cara."
                    active={modalidad === "Presencial"}
                    onClick={() => setModalidad("Presencial")}
                  />
                </div>
                <div className="mt-8 flex justify-end">
                  <PrimaryButton enabled={valid(0)} onClick={next}>
                    Continuar →
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* Paso 1 — Fecha y hora */}
            {step === 1 && (
              <div>
                <div className="mb-6 font-serif text-[30px] leading-[1.15]">
                  ¿Qué día y hora te acomodan?
                </div>
                <div className="scrollx mb-[22px] flex gap-2.5 overflow-x-auto pb-2.5">
                  {days.map((d) => {
                    const on = dateKey === d.key;
                    return (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => seleccionarDia(d.key)}
                        className="flex flex-none cursor-pointer flex-col items-center gap-0.5 rounded-xl border py-3 transition-all"
                        style={{
                          minWidth: 60,
                          borderColor: on ? "#3f8f79" : "#e0d8cc",
                          background: on ? "#3f8f79" : "#fff",
                          color: on ? "#fff" : "#2a2724",
                        }}
                      >
                        <span className="text-[12px] opacity-70">{d.dow}</span>
                        <span className="font-serif text-[20px]">{d.num}</span>
                      </button>
                    );
                  })}
                </div>
                {!dateKey ? (
                  <p className="text-[14px] text-body">
                    Elige un día para ver las horas disponibles.
                  </p>
                ) : loadingTimes ? (
                  <p className="text-[14px] text-body">Cargando horas…</p>
                ) : error ? (
                  <p className="text-[14px] text-[#a33]">{error}</p>
                ) : times.length === 0 ? (
                  <p className="text-[14px] text-body">
                    No quedan horas disponibles ese día. Prueba con otra fecha.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {times.map((t) => {
                      const on = time === t;
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTime(t)}
                          className="cursor-pointer rounded-[10px] border px-3 py-[9px] text-[14px] transition-all"
                          style={{
                            borderColor: on ? "#3f8f79" : "#e0d8cc",
                            background: on ? "#3f8f79" : "#fff",
                            color: on ? "#fff" : "#5a544c",
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-8 flex justify-between">
                  <BackButton onClick={prev} />
                  <PrimaryButton enabled={valid(1)} onClick={next}>
                    Continuar →
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* Paso 2 — Datos */}
            {step === 2 && (
              <div>
                <div className="mb-2 font-serif text-[30px] leading-[1.15]">
                  Ya casi está
                </div>
                <div className="mb-[22px] text-[15px] text-body">{summary}</div>
                <div className="grid gap-3">
                  <Field
                    placeholder="Nombre"
                    value={nombre}
                    onChange={setNombre}
                  />
                  <Field
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                  />
                  <Field
                    placeholder="Teléfono"
                    type="tel"
                    value={tel}
                    onChange={setTel}
                  />
                  <textarea
                    placeholder="Motivo de consulta (opcional)"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    className="min-h-20 resize-y rounded-[10px] border border-line-2 px-[15px] py-[13px] text-[15px] text-ink outline-none focus:border-brand"
                  />
                  <select
                    value={canal}
                    onChange={(e) => setCanal(e.target.value)}
                    className="rounded-[10px] border border-line-2 px-[15px] py-[13px] text-[15px] outline-none transition focus:border-brand"
                    style={{ color: canal ? "#2a2724" : "#a99f8d" }}
                  >
                    <option value="">¿Cómo supiste de mí? (opcional)</option>
                    {CANALES.map((c) => (
                      <option key={c.valor} value={c.valor}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {error && (
                  <p className="mt-4 text-[14px] text-[#a33]">{error}</p>
                )}
                <div className="mt-[26px] flex justify-between">
                  <BackButton onClick={prev} />
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={!canConfirm || submitting}
                    className="rounded-full border-none px-7 py-[13px] text-[15px] font-semibold transition-all"
                    style={{
                      background: canConfirm && !submitting ? "#3f8f79" : "#d8cfbf",
                      color: canConfirm && !submitting ? "#fff" : "#a99f8d",
                      cursor: canConfirm && !submitting ? "pointer" : "not-allowed",
                    }}
                  >
                    {submitting ? "Agendando…" : "Confirmar cita"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-[640px] rounded-[20px] border border-line bg-white p-8 text-center sm:p-14">
            <div className="mb-3 font-serif text-[30px]">
              ¡Solicitud enviada! 🌿
            </div>
            <p className="mb-2 text-[16px] text-body">
              Gracias, {nombre}. Te escribiré para confirmar tu cita:
            </p>
            <p className="mb-[26px] text-[16px] font-semibold text-ink">
              {summary}
            </p>
            <button
              type="button"
              onClick={reset}
              className="cursor-pointer rounded-full border border-[#bcdccf] bg-transparent px-6 py-3 text-[15px] text-brand transition hover:opacity-100 hover:bg-brand-tint"
            >
              Agendar otra hora
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ModalidadCard({
  title,
  desc,
  active,
  onClick,
}: {
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex-1 cursor-pointer rounded-[14px] p-[22px] text-left transition-all"
      style={{
        border: `2px solid ${active ? "#3f8f79" : "#e0d8cc"}`,
        background: active ? "#eef6f2" : "#fff",
      }}
    >
      <div className="mb-1.5 font-serif text-[22px]">{title}</div>
      <div className="text-[14px] text-body">{desc}</div>
    </button>
  );
}

function PrimaryButton({
  enabled,
  onClick,
  children,
}: {
  enabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!enabled}
      className="rounded-full border-none px-7 py-[13px] text-[15px] font-semibold transition-all"
      style={{
        background: enabled ? "#2a2724" : "#d8cfbf",
        color: enabled ? "#f6f1ea" : "#a99f8d",
        cursor: enabled ? "pointer" : "not-allowed",
      }}
    >
      {children}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-full border border-line-2 bg-transparent px-6 py-[13px] text-[15px] text-body transition hover:opacity-100 hover:bg-cream"
    >
      ← Atrás
    </button>
  );
}

function Field({
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-[10px] border border-line-2 px-[15px] py-[13px] text-[15px] text-ink outline-none transition focus:border-brand"
    />
  );
}
