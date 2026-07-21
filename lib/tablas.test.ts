import { describe, it, expect } from "vitest";
import { toggleDir, sortBy } from "./tablas";

describe("lib/tablas", () => {
  describe("toggleDir", () => {
    it("arranca en asc para una columna nueva", () => {
      expect(toggleDir(null, "fecha")).toEqual({ key: "fecha", dir: "asc" });
    });

    it("invierte la dirección al repetir la misma columna", () => {
      const first = toggleDir(null, "fecha");
      expect(toggleDir(first, "fecha")).toEqual({ key: "fecha", dir: "desc" });
    });

    it("resetea a asc al cambiar de columna", () => {
      const first = toggleDir(null, "fecha");
      const second = toggleDir(first, "fecha"); // desc
      expect(toggleDir(second, "monto")).toEqual({ key: "monto", dir: "asc" });
    });
  });

  describe("sortBy", () => {
    it("ordena números ascendente y descendente", () => {
      const rows = [{ n: 3 }, { n: 1 }, { n: 2 }];
      expect(sortBy(rows, (r) => r.n, "asc").map((r) => r.n)).toEqual([1, 2, 3]);
      expect(sortBy(rows, (r) => r.n, "desc").map((r) => r.n)).toEqual([3, 2, 1]);
    });

    it("ordena strings con localeCompare", () => {
      const rows = [{ s: "banana" }, { s: "árbol" }, { s: "cereza" }];
      expect(sortBy(rows, (r) => r.s, "asc").map((r) => r.s)).toEqual(["árbol", "banana", "cereza"]);
    });

    it("es estable ante empates", () => {
      const rows = [
        { n: 1, id: "a" },
        { n: 1, id: "b" },
        { n: 1, id: "c" },
      ];
      expect(sortBy(rows, (r) => r.n, "asc").map((r) => r.id)).toEqual(["a", "b", "c"]);
    });

    it("no muta el array original", () => {
      const rows = [{ n: 2 }, { n: 1 }];
      const sorted = sortBy(rows, (r) => r.n, "asc");
      expect(rows.map((r) => r.n)).toEqual([2, 1]);
      expect(sorted).not.toBe(rows);
    });
  });
});
