import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Postgres concede EXECUTE a PUBLIC por defecto en cada función nueva. En
// 20260720000000 se creó reagendar_cita sin su bloque revoke/grant y quedó
// invocable por anon vía /rest/v1/rpc (corregido en 20260721000000). Este test
// hace cumplir la regla para siempre: toda función SECURITY DEFINER definida en
// las migraciones debe tener un `revoke execute` en alguna migración.

const dir = path.join(__dirname, "migrations");
const contenido = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(dir, f), "utf8"))
  .join("\n");

// Cabeceras de función: desde el `create` hasta el `as $$` del cuerpo.
const cabeceras = [...contenido.matchAll(/create or replace function public\.(\w+)\s*\([\s\S]*?as\s+\$\$/gi)];

describe("migraciones: funciones SECURITY DEFINER", () => {
  it("encuentra funciones que auditar (sanity check del regex)", () => {
    expect(cabeceras.length).toBeGreaterThanOrEqual(7);
  });

  const definer = [
    ...new Set(cabeceras.filter((m) => /security definer/i.test(m[0])).map((m) => m[1])),
  ];

  it.each(definer)("public.%s tiene su bloque revoke execute", (nombre) => {
    const revoke = new RegExp(`revoke execute on function public\\.${nombre}\\s*\\(`, "i");
    expect(contenido).toMatch(revoke);
  });
});
