import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// lib/paypal.ts lee las env vars al llamar getAccessToken() (no a nivel de
// módulo), así que alcanza con fijarlas antes de cada test.
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "client-id-test");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "client-secret-test");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

function mockFetchSequence(responses: Array<{ ok: boolean; json: unknown }>) {
  const fetchMock = vi.fn();
  for (const r of responses) {
    fetchMock.mockResolvedValueOnce({ ok: r.ok, json: async () => r.json });
  }
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("lib/paypal", () => {
  it("createPaypalOrder: obtiene token OAuth y crea la orden con el monto indicado", async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: { access_token: "tok-123" } },
      { ok: true, json: { id: "paypal-order-1" } },
    ]);
    const { createPaypalOrder } = await import("./paypal");

    const result = await createPaypalOrder(9.99);

    expect(result).toEqual({ id: "paypal-order-1" });
    // Segunda llamada = creación de la orden; verificar auth Bearer y monto.
    const [, createCallInit] = fetchMock.mock.calls[1];
    expect(createCallInit.headers.Authorization).toBe("Bearer tok-123");
    const body = JSON.parse(createCallInit.body);
    expect(body.purchase_units[0].amount.value).toBe("9.99");
    expect(body.purchase_units[0].amount.currency_code).toBe("USD");
  });

  it("createPaypalOrder: propaga error si PayPal responde no-ok al crear la orden", async () => {
    mockFetchSequence([
      { ok: true, json: { access_token: "tok-123" } },
      { ok: false, json: {} },
    ]);
    const { createPaypalOrder } = await import("./paypal");

    await expect(createPaypalOrder(9.99)).rejects.toThrow("No se pudo crear la orden en PayPal");
  });

  it("getAccessToken (vía createPaypalOrder): propaga error si el OAuth falla", async () => {
    mockFetchSequence([{ ok: false, json: {} }]);
    const { createPaypalOrder } = await import("./paypal");

    await expect(createPaypalOrder(9.99)).rejects.toThrow("No se pudo autenticar con PayPal");
  });

  it("capturePaypalOrder: captura la orden aprobada", async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: { access_token: "tok-123" } },
      { ok: true, json: { id: "capture-1", status: "COMPLETED" } },
    ]);
    const { capturePaypalOrder } = await import("./paypal");

    const result = await capturePaypalOrder("paypal-order-1");

    expect(result).toEqual({ id: "capture-1", status: "COMPLETED" });
    const [captureUrl] = fetchMock.mock.calls[1];
    expect(captureUrl).toContain("/v2/checkout/orders/paypal-order-1/capture");
  });

  it("capturePaypalOrder: propaga error si la captura falla", async () => {
    mockFetchSequence([
      { ok: true, json: { access_token: "tok-123" } },
      { ok: false, json: {} },
    ]);
    const { capturePaypalOrder } = await import("./paypal");

    await expect(capturePaypalOrder("paypal-order-1")).rejects.toThrow(
      "No se pudo capturar el pago de PayPal",
    );
  });
});
