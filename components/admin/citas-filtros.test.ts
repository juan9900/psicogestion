import { describe, it, expect } from "vitest";
import {
  filtrarCitas,
  fechaHora,
  citasDelDia,
  resumenDia,
  etiquetaMetodoPago,
  type Cita,
} from "./citas-filtros";

function cita(overrides: Partial<Cita>): Cita {
  return {
    id: "1",
    fecha: "2026-07-20",
    hora: "10:00:00",
    modalidad: "online",
    nombre: "Ana Pérez",
    email: "ana@example.com",
    telefono: null,
    motivo: null,
    estado: "pendiente",
    monto: null,
    metodo_pago: null,
    pagado: false,
    ...overrides,
  };
}

describe("citas-filtros", () => {
  describe("filtrarCitas", () => {
    it("'activas' oculta las canceladas", () => {
      const citas = [
        cita({ id: "1", estado: "pendiente" }),
        cita({ id: "2", estado: "confirmada" }),
        cita({ id: "3", estado: "cancelada" }),
      ];
      const res = filtrarCitas(citas, { estado: "activas", modalidad: "", q: "" });
      expect(res.map((c) => c.id).sort()).toEqual(["1", "2"]);
    });

    it("'todas' incluye canceladas", () => {
      const citas = [cita({ id: "1", estado: "pendiente" }), cita({ id: "2", estado: "cancelada" })];
      const res = filtrarCitas(citas, { estado: "todas", modalidad: "", q: "" });
      expect(res).toHaveLength(2);
    });

    it("filtra por un estado específico", () => {
      const citas = [cita({ id: "1", estado: "pendiente" }), cita({ id: "2", estado: "confirmada" })];
      const res = filtrarCitas(citas, { estado: "confirmada", modalidad: "", q: "" });
      expect(res.map((c) => c.id)).toEqual(["2"]);
    });

    it("filtra por modalidad", () => {
      const citas = [cita({ id: "1", modalidad: "online" }), cita({ id: "2", modalidad: "presencial" })];
      const res = filtrarCitas(citas, { estado: "todas", modalidad: "presencial", q: "" });
      expect(res.map((c) => c.id)).toEqual(["2"]);
    });

    it("busca por nombre o email", () => {
      const citas = [
        cita({ id: "1", nombre: "Ana Pérez", email: "ana@example.com" }),
        cita({ id: "2", nombre: "Luis Gómez", email: "luis@example.com" }),
      ];
      expect(filtrarCitas(citas, { estado: "todas", modalidad: "", q: "luis" }).map((c) => c.id)).toEqual(["2"]);
    });
  });

  describe("fechaHora", () => {
    it("combina fecha y hora para ordenar cronológicamente", () => {
      const citas = [cita({ id: "1", fecha: "2026-07-21", hora: "09:00:00" }), cita({ id: "2", fecha: "2026-07-20", hora: "18:00:00" })];
      const ordenadas = [...citas].sort((a, b) => fechaHora(a).localeCompare(fechaHora(b)));
      expect(ordenadas.map((c) => c.id)).toEqual(["2", "1"]);
    });
  });

  describe("citasDelDia", () => {
    it("filtra por fecha y ordena por hora", () => {
      const citas = [
        cita({ id: "1", fecha: "2026-07-20", hora: "10:00:00" }),
        cita({ id: "2", fecha: "2026-07-20", hora: "09:00:00" }),
        cita({ id: "3", fecha: "2026-07-21", hora: "08:00:00" }),
      ];
      expect(citasDelDia(citas, "2026-07-20").map((c) => c.id)).toEqual(["2", "1"]);
    });

    it("devuelve vacío cuando no hay citas ese día", () => {
      const citas = [cita({ id: "1", fecha: "2026-07-20" })];
      expect(citasDelDia(citas, "2026-07-25")).toEqual([]);
    });
  });

  describe("resumenDia", () => {
    it("no reporta 'extra' cuando todas caben", () => {
      const citas = [
        cita({ id: "1", fecha: "2026-07-20", hora: "09:00:00" }),
        cita({ id: "2", fecha: "2026-07-20", hora: "10:00:00" }),
      ];
      const { visibles, extra } = resumenDia(citas, "2026-07-20", 3);
      expect(visibles.map((c) => c.id)).toEqual(["1", "2"]);
      expect(extra).toBe(0);
    });

    it("reporta 'extra' cuando sobran citas y solo devuelve las primeras `max`", () => {
      const citas = [
        cita({ id: "1", fecha: "2026-07-20", hora: "09:00:00" }),
        cita({ id: "2", fecha: "2026-07-20", hora: "10:00:00" }),
        cita({ id: "3", fecha: "2026-07-20", hora: "11:00:00" }),
        cita({ id: "4", fecha: "2026-07-20", hora: "12:00:00" }),
      ];
      const { visibles, extra } = resumenDia(citas, "2026-07-20", 3);
      expect(visibles.map((c) => c.id)).toEqual(["1", "2", "3"]);
      expect(extra).toBe(1);
    });

    it("día sin citas: visibles vacío y extra 0", () => {
      const { visibles, extra } = resumenDia([], "2026-07-20", 3);
      expect(visibles).toEqual([]);
      expect(extra).toBe(0);
    });
  });

  describe("etiquetaMetodoPago", () => {
    it("devuelve la etiqueta legible de un método conocido", () => {
      expect(etiquetaMetodoPago("pago_movil")).toBe("Pago móvil");
      expect(etiquetaMetodoPago("zelle")).toBe("Zelle");
    });

    it("devuelve '—' cuando el valor es null o desconocido", () => {
      expect(etiquetaMetodoPago(null)).toBe("—");
      expect(etiquetaMetodoPago("cripto")).toBe("—");
    });
  });
});
