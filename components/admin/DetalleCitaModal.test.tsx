// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { DetalleCitaModal } from "./DetalleCitaModal";
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
    fecha: "2026-07-22",
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

afterEach(cleanup);

describe("DetalleCitaModal", () => {
  it("muestra edición, acciones (reagendar/cancelar) y sección de pago", () => {
    render(<DetalleCitaModal cita={cita()} onClose={() => {}} />);

    // Cabecera con el nombre y fecha·hora.
    expect(screen.getByRole("heading", { name: "Ana Pérez" })).toBeTruthy();
    // Acciones de la cita.
    expect(screen.getByRole("button", { name: "Reagendar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar datos" })).toBeTruthy();
    // Sección de pago.
    expect(screen.getByText("Pago")).toBeTruthy();
  });

  it("una cita pendiente muestra el botón Confirmar", () => {
    render(<DetalleCitaModal cita={cita({ estado: "pendiente" })} onClose={() => {}} />);
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeTruthy();
  });

  it("el botón Cerrar dispara onClose", () => {
    const onClose = vi.fn();
    render(<DetalleCitaModal cita={cita()} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
