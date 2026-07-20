import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeBuilder } from "@/test/supabaseBuilder";

const fromMock = vi.fn();
const createSignedUrlMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: fromMock,
    storage: { from: () => ({ createSignedUrl: createSignedUrlMock }) },
  }),
}));

function getRequest() {
  return new NextRequest("http://localhost/api/descargar/tok-abc");
}
function ctx(token = "tok-abc") {
  return { params: Promise.resolve({ token }) };
}

beforeEach(() => {
  fromMock.mockReset();
  createSignedUrlMock.mockReset();
});

describe("GET /api/descargar/[token]", () => {
  it("404 si la orden no existe", async () => {
    fromMock.mockReturnValueOnce(makeBuilder({ data: null, error: null }));
    const { GET } = await import("./route");

    const res = await GET(getRequest(), ctx());

    expect(res.status).toBe(404);
  });

  it("403 si la orden no está pagada", async () => {
    fromMock.mockReturnValueOnce(
      makeBuilder({ data: { id: "o1", estado: "pendiente", descargas: 0, max_descargas: 5, recursos: { archivo_path: "a.pdf" } }, error: null }),
    );
    const { GET } = await import("./route");

    const res = await GET(getRequest(), ctx());

    expect(res.status).toBe(403);
  });

  it("403 si se agotó el límite de descargas", async () => {
    fromMock.mockReturnValueOnce(
      makeBuilder({ data: { id: "o1", estado: "pagada", descargas: 5, max_descargas: 5, recursos: { archivo_path: "a.pdf" } }, error: null }),
    );
    const { GET } = await import("./route");

    const res = await GET(getRequest(), ctx());

    expect(res.status).toBe(403);
  });

  it("éxito: genera la URL firmada, incrementa descargas y marca 'entregada'", async () => {
    const updateBuilder = makeBuilder({ data: null, error: null });
    fromMock
      .mockReturnValueOnce(
        makeBuilder({ data: { id: "o1", estado: "pagada", descargas: 1, max_descargas: 5, recursos: { archivo_path: "a.pdf" } }, error: null }),
      )
      .mockReturnValueOnce(updateBuilder);
    createSignedUrlMock.mockResolvedValueOnce({ data: { signedUrl: "https://signed.example/a.pdf" }, error: null });
    const { GET } = await import("./route");

    const res = await GET(getRequest(), ctx());

    expect(res.status).toBe(307); // redirect
    expect(res.headers.get("location")).toBe("https://signed.example/a.pdf");
    expect(updateBuilder.update).toHaveBeenCalledWith({ descargas: 2, estado: "entregada" });
  });

  it("500 si no se pudo generar la URL firmada", async () => {
    fromMock.mockReturnValueOnce(
      makeBuilder({ data: { id: "o1", estado: "entregada", descargas: 1, max_descargas: 5, recursos: { archivo_path: "a.pdf" } }, error: null }),
    );
    createSignedUrlMock.mockResolvedValueOnce({ data: null, error: new Error("boom") });
    const { GET } = await import("./route");

    const res = await GET(getRequest(), ctx());

    expect(res.status).toBe(500);
  });
});
