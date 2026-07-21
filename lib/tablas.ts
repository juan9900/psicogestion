// Helper puro y compartido para ordenar tablas por columna (órdenes, citas,
// y cualquier otra lista admin). No depende de React ni de Supabase para
// poder testearlo sin mocks.

export type Dir = "asc" | "desc";

export type SortState = { key: string; dir: Dir } | null;

/** Alterna dirección si se vuelve a hacer click en la misma columna;
 * si es una columna distinta, arranca en "asc". */
export function toggleDir(current: SortState, key: string): { key: string; dir: Dir } {
  if (current && current.key === key) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return { key, dir: "asc" };
}

/** Ordena una copia de `rows` según el valor devuelto por `get`.
 * Números se comparan numéricamente, strings con localeCompare. Estable. */
export function sortBy<T>(rows: T[], get: (row: T) => string | number, dir: Dir): T[] {
  const factor = dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const va = get(a.row);
      const vb = get(b.row);
      let cmp: number;
      if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb));
      }
      if (cmp === 0) cmp = a.index - b.index; // estabilidad
      return cmp * factor;
    })
    .map((x) => x.row);
}
