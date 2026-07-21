import { RECURSOS_CATEGORIAS, type RecursoCategoria } from "@/lib/recursos-categorias";

export type TipoContenido = "unico" | "pack";
export type OrdenRecursos = "destacados" | "precio_asc" | "precio_desc" | "recientes";

export type RecursosParams = {
  q: string;
  categoria: RecursoCategoria | null;
  tipo: TipoContenido | null;
  orden: OrdenRecursos;
};

type RawSearchParams = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/** Normaliza los searchParams de la URL a un objeto de filtros tipado.
 * Cualquier valor inválido o desconocido cae al default correspondiente. */
export function parseRecursosParams(searchParams: RawSearchParams): RecursosParams {
  const q = first(searchParams.q).trim();

  const categoriaRaw = first(searchParams.categoria);
  const categoria = (RECURSOS_CATEGORIAS as readonly string[]).includes(categoriaRaw)
    ? (categoriaRaw as RecursoCategoria)
    : null;

  const tipoRaw = first(searchParams.tipo);
  const tipo: TipoContenido | null = tipoRaw === "unico" || tipoRaw === "pack" ? tipoRaw : null;

  const ordenRaw = first(searchParams.orden);
  const ordenesValidos: OrdenRecursos[] = ["destacados", "precio_asc", "precio_desc", "recientes"];
  const orden = (ordenesValidos as string[]).includes(ordenRaw) ? (ordenRaw as OrdenRecursos) : "destacados";

  return { q, categoria, tipo, orden };
}

/** Mapea el valor de orden a la columna/dirección de la query de Supabase. */
export function ordenToQuery(orden: OrdenRecursos): { column: string; ascending: boolean } {
  switch (orden) {
    case "precio_asc":
      return { column: "precio_usd", ascending: true };
    case "precio_desc":
      return { column: "precio_usd", ascending: false };
    case "recientes":
      return { column: "created_at", ascending: false };
    case "destacados":
    default:
      return { column: "orden", ascending: true };
  }
}

/** Mapea el filtro de tipo de contenido a los valores de archivo_tipo. */
export function tipoToArchivoTipos(tipo: TipoContenido): string[] {
  return tipo === "unico" ? ["pdf"] : ["zip", "rar"];
}

/** Sanea el texto de búsqueda para usarlo en un filtro `.or(ilike...)` de
 * PostgREST, evitando que comas o comodines rompan la sintaxis del filtro. */
export function sanitizeQuery(q: string): string {
  return q.replace(/[,%()]/g, "").trim();
}
