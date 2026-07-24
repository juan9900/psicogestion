// Conversión de zona horaria para el formulario de agenda. Solo presentación:
// los horarios se guardan y validan siempre en hora de Caracas. Sin dependencias
// externas — usa el `Intl` del navegador/Node.
//
// Caracas (America/Caracas) tiene offset FIJO -04:00: Venezuela no usa horario de
// verano desde 2016. Por eso interpretamos la hora de pared de Caracas con -240
// minutos sin ambigüedad de DST.

export const ZONA_CARACAS = "America/Caracas";
const CARACAS_OFFSET_MIN = -240; // -04:00

/**
 * Interpreta `dateISO` ("yyyy-mm-dd") + `hhmm` ("HH:MM") como hora de pared de
 * Caracas y devuelve el instante (Date en UTC) correspondiente.
 */
export function caracasWallToInstant(dateISO: string, hhmm: string): Date {
  const [y, mo, d] = dateISO.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const utcGuess = Date.UTC(y, mo - 1, d, h, mi);
  return new Date(utcGuess - CARACAS_OFFSET_MIN * 60000);
}

/** Partes año/mes/día de un instante en una zona dada (para comparar fechas). */
function ymdEnZona(instant: Date, tz: string): { y: number; m: number; d: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const val = (t: string) => Number(partes.find((p) => p.type === t)?.value);
  return { y: val("year"), m: val("month"), d: val("day") };
}

/**
 * Convierte una hora de Caracas (`dateISO`+`hhmm`) a `tzDestino`.
 * Devuelve la hora "HH:MM" ya convertida y `difDia` (-1|0|1): cuántos días de
 * diferencia hay con la fecha original (para zonas lejanas que cruzan medianoche).
 */
export function convertirHora(
  dateISO: string,
  hhmm: string,
  tzDestino: string,
): { hora: string; difDia: -1 | 0 | 1 } {
  const instant = caracasWallToInstant(dateISO, hhmm);
  const hora = new Intl.DateTimeFormat("es", {
    timeZone: tzDestino,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(instant);

  const [y, mo, d] = dateISO.split("-").map(Number);
  const dest = ymdEnZona(instant, tzDestino);
  // Comparación por fecha (medianoche local) para saber el desplazamiento de día.
  const base = Date.UTC(y, mo - 1, d);
  const otro = Date.UTC(dest.y, dest.m - 1, dest.d);
  const dif = Math.sign(otro - base) as -1 | 0 | 1;

  // "00:00" a veces sale como "24:00" en algunos entornos; normalizar.
  return { hora: hora === "24:00" ? "00:00" : hora, difDia: dif };
}

/** Zona horaria IANA del visitante (o Caracas como fallback en SSR). */
export function zonaVisitante(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || ZONA_CARACAS;
  } catch {
    return ZONA_CARACAS;
  }
}

/** Offset "GMT-5" de una zona (best-effort; "" si el entorno no lo soporta). */
function etiquetaOffset(tz: string): string {
  try {
    const parte = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    if (!parte) return "";
    // "GMT-04:00" -> "GMT-4"; "GMT-05:30" -> "GMT-5:30"
    const m = parte.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return parte;
    const min = m[3] && m[3] !== "00" ? `:${m[3]}` : "";
    return `GMT${m[1]}${Number(m[2])}${min}`;
  } catch {
    return "";
  }
}

/** Etiqueta corta legible de una zona, p. ej. "Bogotá (GMT-5)". */
export function etiquetaZona(tz: string): string {
  const ciudad = (tz.split("/").pop() ?? tz).replace(/_/g, " ");
  const off = etiquetaOffset(tz);
  return off ? `${ciudad} (${off})` : ciudad;
}
