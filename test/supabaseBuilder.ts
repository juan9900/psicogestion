import { vi } from "vitest";

// Mock mínimo y encadenable del query builder de supabase-js. Los métodos
// intermedios (select/eq/order/...) devuelven `this`; maybeSingle/single
// resuelven al resultado configurado, y el builder también es "thenable"
// para soportar `await supabase.from(...).update(...).eq(...)` sin un
// terminal explícito (patrón usado en varias rutas del proyecto).
export function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "limit", "insert", "update", "delete"]) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (v: typeof result) => unknown) => resolve(result);
  return builder;
}
