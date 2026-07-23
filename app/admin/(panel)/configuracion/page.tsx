import { createClient } from "@/lib/supabase/server";
import { guardarConfigAgenda } from "../../actions";
import { HorarioLaboral, type Franja } from "@/components/admin/HorarioLaboral";

export const dynamic = "force-dynamic";

const input =
  "rounded-[10px] border border-line-2 px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-brand";

export default async function ConfiguracionPage() {
  const supabase = await createClient();

  const [{ data: config }, { data: franjas }] = await Promise.all([
    supabase
      .from("config_agenda")
      .select("duracion_cita_min, zona_horaria")
      .eq("id", 1)
      .maybeSingle<{ duracion_cita_min: number; zona_horaria: string }>(),
    supabase
      .from("franjas_disponibilidad")
      .select("id, dia_semana, hora_inicio, hora_fin, modalidad")
      .order("dia_semana", { ascending: true })
      .order("hora_inicio", { ascending: true })
      .returns<Franja[]>(),
  ]);

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-serif text-[28px] text-ink">Configuración</h1>
        <p className="mt-1 text-[14px] text-body">
          Duración por defecto de las citas y horario laboral (por día y modalidad).
        </p>
      </div>

      <section className="grid gap-3">
        <h2 className="font-serif text-[20px] text-ink">Duración por defecto</h2>
        <form
          action={guardarConfigAgenda}
          className="flex flex-wrap items-end gap-3 rounded-[14px] border border-line bg-white p-4"
        >
          <label className="grid gap-1 text-[12px] text-muted">
            Minutos por cita
            <input
              type="number"
              name="duracion_cita_min"
              min={5}
              max={480}
              step={5}
              defaultValue={config?.duracion_cita_min ?? 60}
              className={`${input} w-[120px]`}
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-brand px-5 py-2 text-[13px] font-medium text-white transition hover:brightness-110"
          >
            Guardar
          </button>
          <span className="text-[12px] text-muted">
            Zona horaria: {config?.zona_horaria ?? "America/Caracas"}
          </span>
        </form>
        <p className="text-[13px] text-muted">
          Es la duración de las reservas del sitio público. Al crear una cita en el panel puedes ponerle una duración distinta.
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-serif text-[20px] text-ink">Horario laboral</h2>
        <p className="text-[13px] text-body">
          Las franjas definen las horas que se ofrecen al agendar. Una franja puede aplicar a ambas modalidades o solo a online/presencial. Un día sin franjas no es laborable.
        </p>
        <HorarioLaboral franjas={franjas ?? []} />
      </section>
    </div>
  );
}
