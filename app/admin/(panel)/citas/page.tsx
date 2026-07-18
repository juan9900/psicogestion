import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/admin/CalendarView";

export const dynamic = "force-dynamic";

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

export default async function CitasPage() {
  const supabase = await createClient();
  const { data: citas } = await supabase
    .from("citas")
    .select("id, fecha, hora, modalidad, nombre, email, telefono, motivo, estado")
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(1000)
    .returns<Cita[]>();

  return (
    <div className="grid gap-5">
      <h1 className="font-serif text-[28px] text-ink">Citas</h1>
      <CalendarView citas={citas ?? []} />
    </div>
  );
}
