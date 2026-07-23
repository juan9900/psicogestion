// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EdicionCita } from "./DetalleCitaModal";
import type { Cita } from "./citas-filtros";

vi.mock("@/app/admin/actions", () => ({
  actualizarEstadoCita: () => {},
  reagendarCita: () => {},
  crearCitaManual: () => {},
  guardarPagoCita: () => {},
  actualizarDatosCita: () => {},
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

describe("EdicionCita", () => {
  it("arranca colapsada: muestra el resumen y no el formulario", () => {
    render(<EdicionCita cita={cita()} />);
    expect(screen.getByText(/Primera consulta/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Editar datos" })).toBeTruthy();
    expect(screen.queryByLabelText("Nombre")).toBeNull();
  });

  it("al pulsar Editar datos muestra el form prellenado con id oculto", () => {
    const { container } = render(<EdicionCita cita={cita()} />);
    fireEvent.click(screen.getByRole("button", { name: "Editar datos" }));

    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Ana Pérez");
    expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe("ana@example.com");
    expect((screen.getByLabelText("Teléfono") as HTMLInputElement).value).toBe("0412000");
    expect((screen.getByLabelText("Modalidad") as HTMLSelectElement).value).toBe("online");

    const hiddenId = container.querySelector<HTMLInputElement>('input[name="id"]')!;
    expect(hiddenId.value).toBe("c1");
  });
});
