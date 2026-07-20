import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeBuilder } from "@/test/supabaseBuilder";

const fromMock = vi.fn();
const rpcMock = vi.fn();
const enviarOrdenRecibidaMock = vi.fn();
const notificarAdminNuevaOrdenMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: fromMock, rpc: rpcMock }),
}));
vi.mock("@/lib/email", () => ({
  enviarOrdenRecibida: (...args: unknown[]) => enviarOrdenRecibidaMock(...args),
  notificarAdminNuevaOrden: (...args: unknown[]) => notificarAdminNuevaOrdenMock(...args),
}));

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ordenes/pago-movil", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
  enviarOrdenRecibidaMock.mockReset();
  notificarAdminNuevaOrdenMock.mockReset();
});

describe("POST /api/ordenes/pago-movil", () => {
  it("400 si faltan datos", async () => {
    const { POST } = await import("./route");
    const res = await POST(postRequest({ slug: "guia" }));
    expect(res.status).toBe(400);
  });

  it("400 si la RPC crear_orden falla", async () => {
    rpcMock.mockReturnValueOnce(makeBuilder({ data: null, error: { message: "recurso inactivo" } }));
    const { POST } = await import("./route");

    const res = await POST(postRequest({ slug: "guia", nombre: "Ana", email: "a@b.com" }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("recurso inactivo");
  });

  it("éxito: crea la orden y envía los dos correos (comprador + admin)", async () => {
    rpcMock.mockReturnValueOnce(
      makeBuilder({ data: { orden_id: "o1", token_descarga: "tok-1", monto: 9.99 }, error: null }),
    );
    fromMock.mockReturnValueOnce(makeBuilder({ data: { titulo: "Guía PDF" }, error: null }));
    const { POST } = await import("./route");

    const res = await POST(
      postRequest({ slug: "guia", nombre: "Ana", email: "a@b.com", referencia: "REF1", comprobantePath: "guia/1.jpg" }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ token: "tok-1" });
    expect(rpcMock).toHaveBeenCalledWith(
      "crear_orden",
      expect.objectContaining({ p_recurso_slug: "guia", p_metodo: "pago_movil", p_comprobante_path: "guia/1.jpg" }),
    );
    expect(enviarOrdenRecibidaMock).toHaveBeenCalledWith(
      expect.objectContaining({ email: "a@b.com", titulo: "Guía PDF" }),
    );
    expect(notificarAdminNuevaOrdenMock).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: "Guía PDF", referencia: "REF1" }),
    );
  });

  it("usa el slug como título de respaldo si no encuentra el recurso", async () => {
    rpcMock.mockReturnValueOnce(
      makeBuilder({ data: { orden_id: "o1", token_descarga: "tok-1", monto: 9.99 }, error: null }),
    );
    fromMock.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const { POST } = await import("./route");

    await POST(postRequest({ slug: "guia-x", nombre: "Ana", email: "a@b.com" }));

    expect(enviarOrdenRecibidaMock).toHaveBeenCalledWith(expect.objectContaining({ titulo: "guia-x" }));
  });
});
