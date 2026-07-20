"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ConfigPago = {
  titular: string | null;
  cedula: string | null;
  telefono: string | null;
  banco: string | null;
  instrucciones: string | null;
} | null;

const input =
  "w-full rounded-[10px] border border-line-2 px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-brand";

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError?: (err: unknown) => void;
      }) => { render: (el: HTMLElement) => void };
    };
  }
}

export function CheckoutRecurso({
  recurso,
  configPago,
  paypalClientId,
}: {
  recurso: { slug: string; titulo: string; precio_usd: number };
  configPago: ConfigPago;
  paypalClientId: string | null;
}) {
  const router = useRouter();
  const [metodo, setMetodo] = useState<"paypal" | "pago_movil">(paypalClientId ? "paypal" : "pago_movil");
  const nombreRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const referenciaRef = useRef<HTMLInputElement>(null);
  const comprobanteRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"idle" | "enviando" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const [paypalScriptReady, setPaypalScriptReady] = useState(false);
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const paypalRenderedRef = useRef(false);

  function datosValidos() {
    const nombre = nombreRef.current?.value.trim();
    const email = emailRef.current?.value.trim();
    if (!nombre || !email) {
      setError("Completa tu nombre y correo.");
      return false;
    }
    return true;
  }

  async function enviarPagoMovil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!datosValidos()) return;
    setEstado("enviando");
    setError(null);
    const supabase = createClient();
    try {
      let comprobantePath: string | null = null;
      const archivo = comprobanteRef.current?.files?.[0];
      if (archivo) {
        const ext = (archivo.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${recurso.slug}/${Date.now()}.${ext}`;
        const { data, error: upErr } = await supabase.storage.from("comprobantes").upload(path, archivo);
        if (upErr) throw upErr;
        comprobantePath = data.path;
      }
      const res = await fetch("/api/ordenes/pago-movil", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: recurso.slug,
          nombre: nombreRef.current!.value.trim(),
          email: emailRef.current!.value.trim(),
          referencia: referenciaRef.current?.value.trim() || null,
          comprobantePath,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo procesar la compra.");
      router.push(`/recursos/orden/${json.token}`);
    } catch (err) {
      setEstado("error");
      setError(err instanceof Error ? err.message : "No se pudo procesar la compra.");
    }
  }

  // El botón de PayPal se monta una sola vez; lee nombre/email desde los refs
  // en el momento del clic, así que no hay closures obsoletas por re-render.
  useEffect(() => {
    if (metodo !== "paypal" || !paypalScriptReady) return;
    if (paypalRenderedRef.current || !window.paypal || !paypalContainerRef.current) return;
    paypalRenderedRef.current = true;

    window.paypal.Buttons({
      createOrder: async () => {
        const res = await fetch("/api/paypal/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: recurso.slug }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "No se pudo iniciar el pago");
        return data.id;
      },
      onApprove: async (data) => {
        if (!datosValidos()) throw new Error("Faltan datos del comprador");
        setEstado("enviando");
        setError(null);
        const res = await fetch("/api/paypal/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paypalOrderId: data.orderID,
            slug: recurso.slug,
            nombre: nombreRef.current!.value.trim(),
            email: emailRef.current!.value.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setEstado("error");
          setError(json.error || "No se pudo confirmar el pago.");
          throw new Error(json.error || "capture failed");
        }
        router.push(`/recursos/orden/${json.token}`);
      },
      onError: () => {
        setEstado("error");
        setError("Ocurrió un error con PayPal. Inténtalo de nuevo.");
      },
    }).render(paypalContainerRef.current);
  }, [metodo, paypalScriptReady, recurso.slug, router]);

  return (
    <div className="rounded-[18px] border border-line bg-white p-6">
      <div className="mb-5 flex gap-2">
        {paypalClientId && (
          <button
            type="button"
            onClick={() => setMetodo("paypal")}
            className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
              metodo === "paypal" ? "bg-brand text-white" : "bg-cream text-body"
            }`}
          >
            PayPal
          </button>
        )}
        <button
          type="button"
          onClick={() => setMetodo("pago_movil")}
          className={`rounded-full px-4 py-2 text-[13px] font-medium transition ${
            metodo === "pago_movil" ? "bg-brand text-white" : "bg-cream text-body"
          }`}
        >
          Pago Móvil
        </button>
      </div>

      <div className="grid gap-2">
        <input ref={nombreRef} placeholder="Nombre completo" className={input} />
        <input ref={emailRef} type="email" placeholder="Correo electrónico" className={input} />
      </div>

      {metodo === "paypal" ? (
        <div className="mt-5">
          {paypalClientId ? (
            <>
              <Script
                src={`https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`}
                onLoad={() => setPaypalScriptReady(true)}
              />
              <div ref={paypalContainerRef} />
            </>
          ) : (
            <p className="text-[13px] text-muted">PayPal no está disponible en este momento.</p>
          )}
        </div>
      ) : (
        <form onSubmit={enviarPagoMovil} className="mt-5 grid gap-3">
          <div className="rounded-[12px] bg-cream p-4 text-[13px] text-body">
            <p className="mb-1 font-medium text-ink">Datos para tu pago móvil</p>
            {configPago?.titular && <p>Titular: {configPago.titular}</p>}
            {configPago?.cedula && <p>Cédula: {configPago.cedula}</p>}
            {configPago?.telefono && <p>Teléfono: {configPago.telefono}</p>}
            {configPago?.banco && <p>Banco: {configPago.banco}</p>}
            {configPago?.instrucciones && <p className="mt-2">{configPago.instrucciones}</p>}
            {!configPago?.titular && !configPago?.telefono && (
              <p>Escríbenos para coordinar el pago móvil.</p>
            )}
          </div>

          <input ref={referenciaRef} placeholder="Nº de referencia (opcional)" className={input} />
          <label className="text-[13px] text-body">
            Comprobante de pago (imagen o PDF)
            <input
              ref={comprobanteRef}
              type="file"
              accept="image/*,application/pdf"
              className="mt-1 block w-full text-[13px] text-body"
            />
          </label>

          <button
            type="submit"
            disabled={estado === "enviando"}
            className="mt-1 rounded-full bg-brand px-5 py-2.5 text-[14px] font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {estado === "enviando" ? "Enviando…" : `Comprar por $${recurso.precio_usd}`}
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-[13px] text-[#a33]">{error}</p>}
    </div>
  );
}
