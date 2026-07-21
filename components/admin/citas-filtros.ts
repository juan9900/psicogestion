export type Cita = {
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

export type FiltroEstadoCita = "activas" | "todas" | "pendiente" | "confirmada" | "cancelada";

export type FiltrosCitas = {
  estado: FiltroEstadoCita;
  modalidad: string; // "" = todas
  q: string;
};

export function filtrarCitas(citas: Cita[], filtros: FiltrosCitas): Cita[] {
  const q = filtros.q.trim().toLowerCase();
  return citas.filter((c) => {
    if (filtros.estado === "activas" && c.estado === "cancelada") return false;
    if (filtros.estado !== "activas" && filtros.estado !== "todas" && c.estado !== filtros.estado) return false;
    if (filtros.modalidad && c.modalidad !== filtros.modalidad) return false;
    if (q) {
      const haystack = `${c.nombre} ${c.email ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

/** Accessor combinado fecha+hora para ordenar cronológicamente. */
export function fechaHora(cita: Cita): string {
  return `${cita.fecha} ${cita.hora}`;
}

/** Citas de un día específico, ordenadas por hora. */
export function citasDelDia(citas: Cita[], fechaISO: string): Cita[] {
  return citas
    .filter((c) => c.fecha === fechaISO)
    .slice()
    .sort((a, b) => a.hora.localeCompare(b.hora));
}

/** Primeras `max` citas del día y cuántas quedan fuera, para el "+N más" del calendario. */
export function resumenDia(
  citas: Cita[],
  fechaISO: string,
  max: number
): { visibles: Cita[]; extra: number } {
  const delDia = citasDelDia(citas, fechaISO);
  return {
    visibles: delDia.slice(0, max),
    extra: Math.max(0, delDia.length - max),
  };
}

export const METODOS_PAGO_CITA: { valor: string; etiqueta: string }[] = [
  { valor: "binance", etiqueta: "Binance" },
  { valor: "efectivo", etiqueta: "Efectivo" },
  { valor: "pago_movil", etiqueta: "Pago móvil" },
  { valor: "zelle", etiqueta: "Zelle" },
];

/** Etiqueta legible de un método de pago de cita, o "—" si no hay valor conocido. */
export function etiquetaMetodoPago(valor: string | null): string {
  return METODOS_PAGO_CITA.find((m) => m.valor === valor)?.etiqueta ?? "—";
}
