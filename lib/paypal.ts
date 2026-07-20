// Helpers server-side para hablar con la API REST de PayPal (checkout v2).
// Nunca se llama desde el cliente: el client id/secret son secretos y el
// monto siempre se decide en el servidor a partir del precio en la BD.

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("No se pudo autenticar con PayPal");
  const data = await res.json();
  return data.access_token as string;
}

// Crea una orden en PayPal por el monto indicado (ya validado contra la BD).
export async function createPaypalOrder(amount: number, currency = "USD") {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }],
    }),
  });
  if (!res.ok) throw new Error("No se pudo crear la orden en PayPal");
  return res.json();
}

// Captura una orden previamente aprobada por el comprador.
export async function capturePaypalOrder(paypalOrderId: string) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("No se pudo capturar el pago de PayPal");
  return res.json();
}
