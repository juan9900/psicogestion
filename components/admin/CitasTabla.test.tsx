// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { CitasTabla } from "./CitasTabla";
import type { Cita } from "./citas-filtros";

// Las server actions no se ejecutan en el test; basta con que existan como funciones.
// Se incluyen también las que usa el DetalleCitaModal (se abre al clickear una fila).
vi.mock("@/app/admin/actions", () => ({
  actualizarEstadoCita: () => {},
  alternarPagadoCita: () => {},
  reagendarCita: () => {},
  crearCitaManual: () => {},
  guardarPagoCita: () => {},
  actualizarDatosCita: () => {},
}));

function cita(overrides: Partial<Cita>): Cita {
  return {
    id: "1",
    fecha: "2026-07-22",
    hora: "10:00:00",
    modalidad: "online",
    nombre: "Ana Pérez",
    email: "ana@example.com",
    telefono: null,
    motivo: null,
    estado: "confirmada",
    monto: null,
    metodo_pago: null,
    pagado: false,
    ...overrides,
  };
}

afterEach(cleanup);

describe("CitasTabla — columna Pagado", () => {
  const citas = [
    cita({ id: "pagada", nombre: "Cita Pagada", pagado: true }),
    cita({ id: "impaga", nombre: "Cita Impaga", pagado: false }),
  ];

  it("muestra el encabezado de columna Pagado", () => {
    render(<CitasTabla citas={citas} />);
    expect(screen.getByRole("columnheader", { name: "Pagado" })).toBeTruthy();
  });

  it("cada fila muestra el estado de pago y envía el valor actual para alternarlo", () => {
    render(<CitasTabla citas={citas} />);

    const filaPagada = screen.getByText("Cita Pagada").closest("tr")!;
    const togglePagada = within(filaPagada).getByRole("button", { name: "Pagado" });
    expect(togglePagada.getAttribute("aria-pressed")).toBe("true");
    const hiddenPagada = filaPagada.querySelector<HTMLInputElement>('input[name="pagado"]')!;
    expect(hiddenPagada.value).toBe("true");

    const filaImpaga = screen.getByText("Cita Impaga").closest("tr")!;
    const toggleImpaga = within(filaImpaga).getByRole("button", { name: "No pagado" });
    expect(toggleImpaga.getAttribute("aria-pressed")).toBe("false");
    const hiddenImpaga = filaImpaga.querySelector<HTMLInputElement>('input[name="pagado"]')!;
    expect(hiddenImpaga.value).toBe("false");
  });
});

describe("CitasTabla — detalle al clickear la fila", () => {
  it("click en la fila abre el modal de detalle de esa cita", () => {
    render(<CitasTabla citas={[cita({ nombre: "Ana Pérez" })]} />);
    // El botón "Reagendar" es exclusivo del modal de detalle.
    expect(screen.queryByRole("button", { name: "Reagendar" })).toBeNull();

    fireEvent.click(screen.getByText("Ana Pérez").closest("tr")!);

    expect(screen.getByRole("button", { name: "Reagendar" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ana Pérez" })).toBeTruthy();
  });

  it("click en el botón de pago de la fila NO abre el modal (stopPropagation)", () => {
    render(<CitasTabla citas={[cita({ nombre: "Ana Pérez", pagado: false })]} />);
    fireEvent.click(screen.getByRole("button", { name: "No pagado" }));
    expect(screen.queryByRole("button", { name: "Reagendar" })).toBeNull();
  });

  it("cerrar el modal lo oculta de nuevo", () => {
    render(<CitasTabla citas={[cita({ nombre: "Ana Pérez" })]} />);
    fireEvent.click(screen.getByText("Ana Pérez").closest("tr")!);
    expect(screen.getByRole("button", { name: "Reagendar" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("button", { name: "Reagendar" })).toBeNull();
  });

  it("abre el detalle correspondiente a la fila clickeada", () => {
    render(
      <CitasTabla
        citas={[
          cita({ id: "1", nombre: "Ana Pérez" }),
          cita({ id: "2", nombre: "Beto Ruiz", hora: "11:00:00" }),
        ]}
      />,
    );
    fireEvent.click(screen.getByText("Beto Ruiz").closest("tr")!);
    expect(screen.getByRole("heading", { name: "Beto Ruiz" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Ana Pérez" })).toBeNull();
  });
});
