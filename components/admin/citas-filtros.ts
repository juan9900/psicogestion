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
  tipo: string;
  ubicacion: string | null;
  duracion_min: number;
  monto: number | null;
  metodo_pago: string | null;
  pagado: boolean;
};

export type Bloqueo = {
  id: string;
  fecha: string;
  fecha_fin: string | null; // null = un solo día
  motivo: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
};

export const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

/** Título legible de un día ISO, ej. "Lun 15 de julio". */
export function tituloDia(dISO: string): string {
  const [y, m, d] = dISO.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return `${DIAS[dow]} ${d} de ${MESES[m - 1].toLowerCase()}`;
}

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

export const TIPOS_CITA: { valor: string; etiqueta: string }[] = [
  { valor: "consulta", etiqueta: "Consulta" },
  { valor: "reunion", etiqueta: "Reunión" },
];

/** Etiqueta legible de un tipo de cita, con "Consulta" como valor por defecto. */
export function etiquetaTipoCita(valor: string | null): string {
  return TIPOS_CITA.find((t) => t.valor === valor)?.etiqueta ?? "Consulta";
}

// Modalidades de una franja laboral. "" (valor vacío) = aplica a ambas.
export const MODALIDADES_FRANJA: { valor: string; etiqueta: string }[] = [
  { valor: "", etiqueta: "Ambas" },
  { valor: "online", etiqueta: "Online" },
  { valor: "presencial", etiqueta: "Presencial" },
];

/**
 * Hora de fin "HH:MM" de una cita dada su hora de inicio ("HH:MM" o "HH:MM:SS")
 * y su duración en minutos. Envuelve a 24h por seguridad (no debería cruzar
 * medianoche en la práctica).
 */
export function horaFin(horaInicio: string, duracionMin: number): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const total = (h * 60 + m + duracionMin) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
