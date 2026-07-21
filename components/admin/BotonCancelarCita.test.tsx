// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { BotonCancelarCita } from "./BotonCancelarCita";

vi.mock("@/app/admin/actions", () => ({
  actualizarEstadoCita: () => {},
}));

afterEach(cleanup);

describe("BotonCancelarCita", () => {
  it("no muestra el diálogo de confirmación hasta pulsar Cancelar", () => {
    render(<BotonCancelarCita id="c1" nombre="Ana Pérez" />);
    expect(screen.queryByText("Sí, cancelar")).toBeNull();
  });

  it("abre un diálogo con el nombre y un form que envía estado=cancelada", () => {
    render(<BotonCancelarCita id="c1" nombre="Ana Pérez" />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // El nombre aparece en el texto de confirmación.
    expect(screen.getByText(/Ana Pérez/)).toBeTruthy();

    const confirmar = screen.getByRole("button", { name: "Sí, cancelar" });
    const form = confirmar.closest("form")!;
    expect(form.querySelector<HTMLInputElement>('input[name="id"]')!.value).toBe("c1");
    expect(form.querySelector<HTMLInputElement>('input[name="estado"]')!.value).toBe("cancelada");
  });
});
