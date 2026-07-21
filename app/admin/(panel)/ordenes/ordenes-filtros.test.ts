import { describe, it, expect } from "vitest";
import { filtrarOrdenes, rankEstadoOrden, type Orden } from "./ordenes-filtros";

function orden(overrides: Partial<Orden>): Orden {
  return {
    id: "1",
    comprador_nombre: "Ana Pérez",
    comprador_email: "ana@example.com",
    monto: 10,
    moneda: "USD",
    metodo_pago: "paypal",
    referencia_pago: null,
    comprobante_path: null,
    estado: "pendiente",
    created_at: "2026-01-01T00:00:00Z",
    recursos: { titulo: "Guía" },
    ...overrides,
  };
}

describe("ordenes-filtros", () => {
  describe("filtrarOrdenes", () => {
    it("sin filtros devuelve todo", () => {
      const ordenes = [orden({ id: "1" }), orden({ id: "2" })];
      expect(filtrarOrdenes(ordenes, { estado: "", metodo: "", q: "" })).toHaveLength(2);
    });

    it("filtra por estado", () => {
      const ordenes = [orden({ id: "1", estado: "pendiente" }), orden({ id: "2", estado: "pagada" })];
      const res = filtrarOrdenes(ordenes, { estado: "pagada", metodo: "", q: "" });
      expect(res.map((o) => o.id)).toEqual(["2"]);
    });

    it("filtra por método de pago", () => {
      const ordenes = [orden({ id: "1", metodo_pago: "usdt" }), orden({ id: "2", metodo_pago: "paypal" })];
      const res = filtrarOrdenes(ordenes, { estado: "", metodo: "usdt", q: "" });
      expect(res.map((o) => o.id)).toEqual(["1"]);
    });

    it("busca por nombre o email, sin distinguir mayúsculas", () => {
      const ordenes = [
        orden({ id: "1", comprador_nombre: "Ana Pérez", comprador_email: "ana@example.com" }),
        orden({ id: "2", comprador_nombre: "Luis Gómez", comprador_email: "luis@example.com" }),
      ];
      expect(filtrarOrdenes(ordenes, { estado: "", metodo: "", q: "ANA" }).map((o) => o.id)).toEqual(["1"]);
      expect(filtrarOrdenes(ordenes, { estado: "", metodo: "", q: "luis@example" }).map((o) => o.id)).toEqual(["2"]);
    });

    it("combina filtros con AND", () => {
      const ordenes = [
        orden({ id: "1", estado: "pendiente", metodo_pago: "paypal" }),
        orden({ id: "2", estado: "pendiente", metodo_pago: "usdt" }),
      ];
      const res = filtrarOrdenes(ordenes, { estado: "pendiente", metodo: "usdt", q: "" });
      expect(res.map((o) => o.id)).toEqual(["2"]);
    });
  });

  describe("rankEstadoOrden", () => {
    it("ordena pendiente primero y rechazada al final", () => {
      const estados = ["rechazada", "pagada", "pendiente", "entregada"];
      const ordenados = [...estados].sort((a, b) => rankEstadoOrden(a) - rankEstadoOrden(b));
      expect(ordenados).toEqual(["pendiente", "pagada", "entregada", "rechazada"]);
    });
  });
});
