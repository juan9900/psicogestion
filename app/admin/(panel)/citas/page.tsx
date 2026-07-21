import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/admin/CalendarView";
import { CitasTabla } from "@/components/admin/CitasTabla";

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
  monto: number | null;
  metodo_pago: string | null;
  pagado: boolean;
};

export default async function CitasPage() {
  const supabase = await createClient();
  const { data: citas, error } = await supabase
    .from("citas")
    .select("id, fecha, hora, modalidad, nombre, email, telefono, motivo, estado, monto, metodo_pago, pagado")
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true })
    .limit(1000)
    .returns<Cita[]>();

  if (error) {
    // Sin esto, un fallo de la query (p. ej. columna faltante) se veía como
    // "calendario vacío" en vez de un error diagnosticable.
    console.error("Error cargando citas:", error);
  }

  return (
    <div className="grid gap-5">
      <h1 className="font-serif text-[28px] text-ink">Citas</h1>
      {error && (
        <div className="rounded-[12px] border border-[#e7c9c0] bg-[#fbeeea] px-4 py-3 text-[13px] text-[#a3402c]">
          No se pudieron cargar las citas. Intenta recargar la página.
        </div>
      )}
      <CalendarView citas={citas ?? []} />

      <div>
        <h2 className="mb-3 font-serif text-[20px] text-ink">Todas las citas</h2>
        <CitasTabla citas={citas ?? []} />
      </div>
    </div>
  );
}
