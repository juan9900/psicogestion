import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// El cliente Resend se instancia a nivel de módulo (`new Resend(...)`), así
// que hay que mockear el paquete antes de importar lib/email y usar
// vi.resetModules() entre tests para que cada uno tenga su propio mock limpio
// y sus propias env vars (FROM/ADMIN_EMAIL se leen también a nivel de módulo).
const sendMock = vi.fn();

vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(function Resend() {
    return { emails: { send: sendMock } };
  }),
}));

beforeEach(() => {
  sendMock.mockReset();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("EMAIL_FROM", "onboarding@resend.dev");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("lib/email", () => {
  it("enviarLinkDescarga: manda el correo con el enlace de la orden", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "email-1" }, error: null });
    const { enviarLinkDescarga } = await import("./email");

    await enviarLinkDescarga({ email: "cliente@example.com", nombre: "Ana", titulo: "Guía PDF", token: "tok-abc" });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("cliente@example.com");
    expect(call.subject).toContain("Guía PDF");
    expect(call.html).toContain("http://localhost:3000/recursos/orden/tok-abc");
    // Plantilla de marca: wordmark y versión de texto plano.
    expect(call.html).toContain(">Psico<");
    expect(call.html).toContain(">Gestión<");
    expect(call.text).toContain("http://localhost:3000/recursos/orden/tok-abc");
  });

  it("enviarOrdenRecibida: manda el correo de confirmación de recepción", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "email-2" }, error: null });
    const { enviarOrdenRecibida } = await import("./email");

    await enviarOrdenRecibida({ email: "cliente@example.com", nombre: "Ana", titulo: "Guía PDF" });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.subject).toContain("Recibí tu comprobante");
    expect(call.html).toContain(">Psico<");
    expect(call.text).toContain("Guía PDF");
  });

  it("notificarAdminNuevaOrden: manda al ADMIN_EMAIL configurado", async () => {
    sendMock.mockResolvedValueOnce({ data: { id: "email-3" }, error: null });
    const { notificarAdminNuevaOrden } = await import("./email");

    await notificarAdminNuevaOrden({ titulo: "Guía PDF", nombre: "Ana", email: "cliente@example.com", referencia: "REF1" });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const call = sendMock.mock.calls[0][0];
    expect(call.to).toBe("admin@example.com");
    expect(call.text).toContain("REF1");
  });

  it("notificarAdminNuevaOrden: no envía nada si falta ADMIN_EMAIL", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    const { notificarAdminNuevaOrden } = await import("./email");

    await notificarAdminNuevaOrden({ titulo: "Guía PDF", nombre: "Ana", email: "cliente@example.com", referencia: null });

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("es best-effort: un fallo de Resend no lanza excepción", async () => {
    sendMock.mockRejectedValueOnce(new Error("Resend caído"));
    const { enviarLinkDescarga } = await import("./email");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      enviarLinkDescarga({ email: "cliente@example.com", nombre: "Ana", titulo: "Guía PDF", token: "tok-abc" }),
    ).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
