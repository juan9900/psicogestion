import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeBuilder } from "@/test/supabaseBuilder";

const fromMock = vi.fn();
const capturePaypalOrderMock = vi.fn();
const enviarLinkDescargaMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock }),
}));
vi.mock("@/lib/paypal", () => ({
  capturePaypalOrder: (...args: unknown[]) => capturePaypalOrderMock(...args),
}));
vi.mock("@/lib/email", () => ({
  enviarLinkDescarga: (...args: unknown[]) => enviarLinkDescargaMock(...args),
}));

const RECURSO = { id: "recurso-1", precio_usd: 9.99, titulo: "Guía PDF" };

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/paypal/capture", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function capturaCompletada(monto: string, moneda = "USD") {
  return {
    purchase_units: [{ payments: { captures: [{ id: "capture-1", status: "COMPLETED", amount: { value: monto, currency_code: moneda } }] } }],
  };
}

beforeEach(() => {
  fromMock.mockReset();
  capturePaypalOrderMock.mockReset();
  enviarLinkDescargaMock.mockReset();
});

describe("POST /api/paypal/capture", () => {
  it("400 si faltan datos", async () => {
    const { POST } = await import("./route");
    const res = await POST(postRequest({ slug: "guia" }));
    expect(res.status).toBe(400);
  });

  it("404 si el recurso no existe o está inactivo", async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const { POST } = await import("./route");

    const res = await POST(postRequest({ paypalOrderId: "po-1", slug: "guia", email: "a@b.com" }));

    expect(res.status).toBe(404);
  });

  it("409 si el monto capturado no coincide con el precio en la BD", async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ data: RECURSO, error: null }));
    capturePaypalOrderMock.mockResolvedValueOnce(capturaCompletada("1.00"));
    const { POST } = await import("./route");

    const res = await POST(postRequest({ paypalOrderId: "po-1", slug: "guia", nombre: "Ana", email: "a@b.com" }));

    expect(res.status).toBe(409);
    expect(enviarLinkDescargaMock).not.toHaveBeenCalled();
  });

  it("idempotencia: si la captura ya fue procesada, devuelve el token existente sin reenviar correo", async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ data: RECURSO, error: null }));
    capturePaypalOrderMock.mockResolvedValueOnce(capturaCompletada("9.99"));
    fromMock.mockReturnValueOnce(makeBuilder({ data: { token_descarga: "tok-existente" }, error: null }));
    const { POST } = await import("./route");

    const res = await POST(postRequest({ paypalOrderId: "po-1", slug: "guia", nombre: "Ana", email: "a@b.com" }));
    const json = await res.json();

    expect(json).toEqual({ token: "tok-existente" });
    expect(enviarLinkDescargaMock).not.toHaveBeenCalled();
  });

  it("éxito: inserta la orden pagada y envía el link de descarga", async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ data: RECURSO, error: null })); // recursos
    capturePaypalOrderMock.mockResolvedValueOnce(capturaCompletada("9.99"));
    fromMock.mockReturnValueOnce(makeBuilder({ data: null, error: null })); // sin duplicado
    fromMock.mockReturnValueOnce(makeBuilder({ data: { token_descarga: "tok-nuevo" }, error: null })); // insert
    const { POST } = await import("./route");

    const res = await POST(postRequest({ paypalOrderId: "po-1", slug: "guia", nombre: "Ana", email: "A@B.com" }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ token: "tok-nuevo" });
    expect(enviarLinkDescargaMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.com", titulo: "Guía PDF", token: "tok-nuevo" }),
    );
  });

  it("502 si PayPal falla al capturar", async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ data: RECURSO, error: null }));
    capturePaypalOrderMock.mockRejectedValueOnce(new Error("PayPal caído"));
    const { POST } = await import("./route");

    const res = await POST(postRequest({ paypalOrderId: "po-1", slug: "guia", nombre: "Ana", email: "a@b.com" }));

    expect(res.status).toBe(502);
  });
});
