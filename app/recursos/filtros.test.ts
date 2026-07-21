import { describe, it, expect } from "vitest";
import { parseRecursosParams, ordenToQuery, tipoToArchivoTipos, sanitizeQuery } from "./filtros";

describe("app/recursos/filtros", () => {
  describe("parseRecursosParams", () => {
    it("devuelve los defaults cuando no hay params", () => {
      expect(parseRecursosParams({})).toEqual({
        q: "",
        categoria: null,
        tipo: null,
        orden: "destacados",
      });
    });

    it("normaliza una categoría válida", () => {
      expect(parseRecursosParams({ categoria: "Autoestima" }).categoria).toBe("Autoestima");
    });

    it("descarta una categoría desconocida", () => {
      expect(parseRecursosParams({ categoria: "no-existe" }).categoria).toBeNull();
    });

    it("acepta tipo unico o pack, descarta otros valores", () => {
      expect(parseRecursosParams({ tipo: "unico" }).tipo).toBe("unico");
      expect(parseRecursosParams({ tipo: "pack" }).tipo).toBe("pack");
      expect(parseRecursosParams({ tipo: "otro" }).tipo).toBeNull();
    });

    it("cae a 'destacados' si el orden no es válido", () => {
      expect(parseRecursosParams({ orden: "aleatorio" }).orden).toBe("destacados");
      expect(parseRecursosParams({ orden: "precio_asc" }).orden).toBe("precio_asc");
    });

    it("toma el primer valor si un param llega como array", () => {
      expect(parseRecursosParams({ q: ["ansiedad", "otro"] }).q).toBe("ansiedad");
    });

    it("recorta espacios del texto de búsqueda", () => {
      expect(parseRecursosParams({ q: "  duelo  " }).q).toBe("duelo");
    });
  });

  describe("ordenToQuery", () => {
    it("mapea cada valor de orden a su columna y dirección", () => {
      expect(ordenToQuery("destacados")).toEqual({ column: "orden", ascending: true });
      expect(ordenToQuery("precio_asc")).toEqual({ column: "precio_usd", ascending: true });
      expect(ordenToQuery("precio_desc")).toEqual({ column: "precio_usd", ascending: false });
      expect(ordenToQuery("recientes")).toEqual({ column: "created_at", ascending: false });
    });
  });

  describe("tipoToArchivoTipos", () => {
    it("mapea unico a pdf y pack a zip/rar", () => {
      expect(tipoToArchivoTipos("unico")).toEqual(["pdf"]);
      expect(tipoToArchivoTipos("pack")).toEqual(["zip", "rar"]);
    });
  });

  describe("sanitizeQuery", () => {
    it("elimina comas, porcentajes y paréntesis", () => {
      expect(sanitizeQuery("ansiedad, (test) 100%")).toBe("ansiedad test 100");
    });
  });
});
