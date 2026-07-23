import { describe, it, expect } from "vitest";
import {
  porCanal,
  resumenCitas,
  resumenTienda,
  serieMensual,
  topRecursos,
  type CitaAnalisis,
  type OrdenAnalisis,
  type RecursoAnalisis,
} from "./analisis-datos";

function cita(overrides: Partial<CitaAnalisis>): CitaAnalisis {
  return {
    fecha: "2026-07-10",
    estado: "confirmada",
    modalidad: "online",
    monto: null,
    pagado: false,
    veces_reagendada: 0,
    canal: null,
    ...overrides,
  };
}

function orden(overrides: Partial<OrdenAnalisis>): OrdenAnalisis {
  return {
    monto: 10,
    estado: "pagada",
    metodo_pago: "paypal",
    recurso_id: "r1",
    created_at: "2026-07-01T00:00:00Z",
    confirmado_at: "2026-07-02T00:00:00Z",
    recursos: { titulo: "Guía", categoria: "Ansiedad y estrés" },
    ...overrides,
  };
}

function recurso(overrides: Partial<RecursoAnalisis>): RecursoAnalisis {
  return { id: "r1", titulo: "Guía", categoria: "Ansiedad y estrés", activo: true, ...overrides };
}

describe("analisis-datos", () => {
  describe("resumenCitas", () => {
    it("sin citas devuelve todo en cero", () => {
      expect(resumenCitas([])).toEqual({
        total: 0,
        pendientes: 0,
        confirmadas: 0,
        canceladas: 0,
        reagendadas: 0,
        online: 0,
        presencial: 0,
        ingresos: 0,
      });
    });

    it("cuenta por estado, modalidad y reagendadas", () => {
      const citas = [
        cita({ estado: "pendiente", modalidad: "online" }),
        cita({ estado: "confirmada", modalidad: "presencial", veces_reagendada: 2 }),
        cita({ estado: "cancelada", modalidad: "online" }),
      ];
      const r = resumenCitas(citas);
      expect(r.total).toBe(3);
      expect(r.pendientes).toBe(1);
      expect(r.confirmadas).toBe(1);
      expect(r.canceladas).toBe(1);
      expect(r.reagendadas).toBe(1);
      expect(r.online).toBe(2);
      expect(r.presencial).toBe(1);
    });

    it("suma ingresos solo de citas pagadas con monto", () => {
      const citas = [
        cita({ pagado: true, monto: 30 }),
        cita({ pagado: false, monto: 30 }), // no pagada: no cuenta
        cita({ pagado: true, monto: null }), // sin monto: no suma
      ];
      expect(resumenCitas(citas).ingresos).toBe(30);
    });
  });

  describe("resumenTienda", () => {
    it("sin órdenes devuelve ceros y arrays vacíos", () => {
      expect(resumenTienda([])).toEqual({ ventas: 0, ingresos: 0, porMetodo: [], porCategoria: [] });
    });

    it("excluye pendientes y rechazadas del conteo e ingresos", () => {
      const ordenes = [
        orden({ estado: "pendiente", monto: 5 }),
        orden({ estado: "rechazada", monto: 5 }),
        orden({ estado: "pagada", monto: 20 }),
        orden({ estado: "entregada", monto: 15 }),
      ];
      const r = resumenTienda(ordenes);
      expect(r.ventas).toBe(2);
      expect(r.ingresos).toBe(35);
    });

    it("agrupa ingresos por método de pago y por categoría", () => {
      const ordenes = [
        orden({ estado: "pagada", monto: 10, metodo_pago: "paypal", recursos: { titulo: "A", categoria: "Autoestima" } }),
        orden({ estado: "pagada", monto: 20, metodo_pago: "usdt", recursos: { titulo: "B", categoria: "Autoestima" } }),
        orden({ estado: "entregada", monto: 5, metodo_pago: "paypal", recursos: { titulo: "C", categoria: null } }),
      ];
      const r = resumenTienda(ordenes);
      expect(r.porMetodo).toEqual([
        { metodo: "usdt", ingresos: 20, ventas: 1 },
        { metodo: "paypal", ingresos: 15, ventas: 2 },
      ]);
      expect(r.porCategoria).toEqual([
        { categoria: "Autoestima", ingresos: 30, ventas: 2 },
        { categoria: "Sin categoría", ingresos: 5, ventas: 1 },
      ]);
    });
  });

  describe("serieMensual", () => {
    it("agrupa citas y ventas por mes, con ingresos de citas y tienda separados", () => {
      const citas = [
        cita({ fecha: "2026-06-05", pagado: true, monto: 40 }),
        cita({ fecha: "2026-07-01" }),
      ];
      const ordenes = [
        orden({ estado: "pagada", monto: 10, confirmado_at: "2026-06-15T00:00:00Z" }),
        orden({ estado: "pendiente", monto: 99, confirmado_at: "2026-07-01T00:00:00Z" }), // excluida
      ];
      const serie = serieMensual(citas, ordenes);
      expect(serie).toEqual([
        { mes: "2026-06", citas: 1, ingresosCitas: 40, ventas: 1, ingresosTienda: 10 },
        { mes: "2026-07", citas: 1, ingresosCitas: 0, ventas: 0, ingresosTienda: 0 },
      ]);
    });

    it("usa created_at cuando confirmado_at es null", () => {
      const ordenes = [orden({ estado: "pagada", monto: 7, confirmado_at: null, created_at: "2026-05-20T00:00:00Z" })];
      const serie = serieMensual([], ordenes);
      expect(serie).toEqual([{ mes: "2026-05", citas: 0, ingresosCitas: 0, ventas: 1, ingresosTienda: 7 }]);
    });
  });

  describe("topRecursos", () => {
    it("ordena por ingresos descendente y excluye ventas no confirmadas", () => {
      const recursos = [recurso({ id: "r1", titulo: "Guía" }), recurso({ id: "r2", titulo: "Curso" })];
      const ordenes = [
        orden({ recurso_id: "r1", estado: "pagada", monto: 10, recursos: { titulo: "Guía", categoria: null } }),
        orden({ recurso_id: "r2", estado: "entregada", monto: 50, recursos: { titulo: "Curso", categoria: null } }),
        orden({ recurso_id: "r2", estado: "rechazada", monto: 50, recursos: { titulo: "Curso", categoria: null } }),
      ];
      expect(topRecursos(ordenes, recursos)).toEqual([
        { titulo: "Curso", ventas: 1, ingresos: 50 },
        { titulo: "Guía", ventas: 1, ingresos: 10 },
      ]);
    });

    it("sin ventas devuelve arreglo vacío", () => {
      expect(topRecursos([], [])).toEqual([]);
    });
  });

  describe("porCanal", () => {
    it("sin citas devuelve arreglo vacío", () => {
      expect(porCanal([])).toEqual([]);
    });

    it("agrupa por canal con su etiqueta y ordena por conteo descendente", () => {
      const citas = [
        cita({ canal: "instagram" }),
        cita({ canal: "instagram" }),
        cita({ canal: "recomendacion" }),
      ];
      expect(porCanal(citas)).toEqual([
        { canal: "Instagram", valor: 2 },
        { canal: "Me la recomendaron", valor: 1 },
      ]);
    });

    it("agrupa null y vacío como 'Sin especificar'", () => {
      const citas = [cita({ canal: null }), cita({ canal: "" }), cita({ canal: "  " })];
      expect(porCanal(citas)).toEqual([{ canal: "Sin especificar", valor: 3 }]);
    });

    it("un canal desconocido conserva su valor crudo como etiqueta", () => {
      expect(porCanal([cita({ canal: "linkedin" })])).toEqual([
        { canal: "linkedin", valor: 1 },
      ]);
    });
  });
});
