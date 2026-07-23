// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { CalendarView } from "./CalendarView";
import type { Cita } from "./citas-filtros";

vi.mock("@/app/admin/actions", () => ({
  actualizarEstadoCita: () => {},
  reagendarCita: () => {},
  crearCitaManual: () => {},
  guardarPagoCita: () => {},
  actualizarDatosCita: () => {},
  alternarPagadoCita: () => {},
}));

function cita(overrides: Partial<Cita> = {}): Cita {
  return {
    id: "c1",
    fecha: "2026-07-15",
    hora: "10:00:00",
    modalidad: "online",
    nombre: "Ana Pérez",
    email: "ana@example.com",
    telefono: "0412000",
    motivo: "Primera consulta",
    estado: "confirmada",
    tipo: "consulta",
    ubicacion: null,
    duracion_min: 60,
    monto: null,
    metodo_pago: null,
    pagado: false,
    ...overrides,
  };
}

// Fijar solo la fecha (no los timers) para que el mes mostrado sea julio 2026.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 6, 15));
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

/** Localiza el botón de celda del día indicado (discriminado por su clase y el número). */
function celdaDia(dia: string): HTMLElement {
  const celdas = screen
    .getAllByRole("button")
    .filter((b) => b.className.includes("min-h-[56px]"));
  const celda = celdas.find((b) => b.querySelector("span")?.textContent === dia);
  if (!celda) throw new Error(`No se encontró la celda del día ${dia}`);
  return celda;
}

describe("CalendarView — navegación día → detalle → volver", () => {
  it("desde el modal del día se abre el detalle y al cerrarlo se vuelve al modal del día", () => {
    render(<CalendarView citas={[cita()]} />);

    // 1. Tocar el día 15 abre el modal del día (aún sin "Reagendar", exclusivo del detalle).
    fireEvent.click(celdaDia("15"));
    expect(screen.getByRole("heading")).toBeTruthy(); // título del modal del día
    expect(screen.queryByRole("button", { name: "Reagendar" })).toBeNull();

    // 2. Click en la cita de la lista (la modalidad "online" solo aparece en el listado del día).
    fireEvent.click(screen.getByText("online").closest("button")!);

    // 3. Se abre el detalle (aparece "Reagendar") y el modal del día queda oculto.
    expect(screen.getByRole("button", { name: "Reagendar" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ana Pérez" })).toBeTruthy();

    // 4. Cerrar el detalle vuelve al modal del día (sin "Reagendar", con el listado otra vez).
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("button", { name: "Reagendar" })).toBeNull();
    expect(screen.getByText("online")).toBeTruthy();
  });

  it("un día sin citas muestra 'Sin citas este día'", () => {
    render(<CalendarView citas={[cita()]} />);
    fireEvent.click(celdaDia("20"));
    expect(screen.getByText("Sin citas este día.")).toBeTruthy();
  });
});
