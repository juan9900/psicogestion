import { Resend } from "resend";
import { site } from "@/lib/site";

// Envío de correos transaccionales (link de descarga, avisos de orden).
// SOLO server-side: usa RESEND_API_KEY, un secreto.
//
// Regla clave: el correo es un refuerzo, no la fuente de verdad (la orden ya
// existe en la BD antes de llamar a esto). Cada función atrapa sus propios
// errores y los registra, para que un fallo de envío nunca rompa la compra.

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";

function urlOrden(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${base}/recursos/orden/${token}`;
}

// -------------------------------------------------------------------------
// Plantilla de marca. El HTML de correo NO es HTML de sitio: Gmail/Outlook
// no soportan flexbox/grid ni siempre respetan <style>, así que el layout va
// en tablas y cada elemento lleva sus estilos inline. Los colores son los
// mismos tokens de app/globals.css (@theme) pero en hex plano — los clientes
// de correo no leen custom properties de CSS. La tipografía cae a
// Georgia/system sans porque los correos no cargan Newsreader/Instrument.
// -------------------------------------------------------------------------

const C = {
  cream: "#f6f1ea",
  white: "#ffffff",
  ink: "#2a2724",
  body: "#5a544c",
  muted: "#8a8175",
  brand: "#3f8f79",
  brandDark: "#357a67",
  brandTint: "#eef6f2",
  line: "#e7ded1",
  sand: "#efe7db",
};

const FONT_SERIF = "Georgia, 'Times New Roman', serif";
const FONT_SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";

// Wordmark "Psico.Gestión" — mismo patrón de color que components/Wordmark.tsx.
function wordmark() {
  return (
    `<span style="font-family:${FONT_SERIF}; font-size:21px; letter-spacing:-0.01em;">` +
    `<span style="font-weight:700; color:${C.ink};">Psico</span>` +
    `<span style="color:${C.brand};">.</span>` +
    `<span style="font-weight:400; color:${C.ink};">Gestión</span>` +
    `</span>`
  );
}

// Etiqueta de estado — mismo lenguaje visual que los badges de /admin/ordenes
// y los estados de /recursos/orden/[token].
function eyebrow(texto: string) {
  return (
    `<span style="display:inline-block; background:${C.brandTint}; color:${C.brandDark}; ` +
    `font-family:${FONT_SANS}; font-size:12px; font-weight:600; letter-spacing:0.03em; ` +
    `text-transform:uppercase; padding:5px 14px; border-radius:999px;">${texto}</span>`
  );
}

// Botón-píldora verde — mismo estilo que los CTAs del sitio.
function boton(href: string, texto: string) {
  return (
    `<a href="${href}" style="display:inline-block; background:${C.brand}; color:${C.white}; ` +
    `font-family:${FONT_SANS}; font-size:15px; font-weight:600; text-decoration:none; ` +
    `padding:13px 28px; border-radius:999px;">${texto}</a>`
  );
}

// Pie con los datos de contacto — miniatura de components/Footer.tsx.
function pieContacto() {
  return [site.ubicacion, site.telefono, site.email, site.instagram].join(" &nbsp;·&nbsp; ");
}

function pieContactoTexto() {
  return [site.ubicacion, site.telefono, site.email, site.instagram].join(" · ");
}

// Envoltorio de tabla compartido: fondo cream, tarjeta blanca centrada
// (encabezado con wordmark + etiqueta de estado + contenido), y una franja
// oscura de pie con el contacto — sin depender de ninguna imagen remota.
function emailShell({ eyebrowTexto, cuerpoHtml }: { eyebrowTexto: string; cuerpoHtml: string }) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
  <body style="margin:0; padding:0; background:${C.cream};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
            <tr>
              <td style="padding-bottom:20px;">${wordmark()}</td>
            </tr>
            <tr>
              <td style="background:${C.white}; border:1px solid ${C.line}; border-radius:18px; padding:32px;">
                <div style="margin-bottom:18px;">${eyebrow(eyebrowTexto)}</div>
                ${cuerpoHtml}
              </td>
            </tr>
            <tr><td style="height:16px; line-height:16px; font-size:0;">&nbsp;</td></tr>
            <tr>
              <td style="background:${C.ink}; border-radius:14px; padding:20px 24px;">
                <p style="margin:0 0 4px; font-family:${FONT_SANS}; font-size:13px; font-weight:600; color:${C.sand};">
                  ${site.name}
                </p>
                <p style="margin:0; font-family:${FONT_SANS}; font-size:12px; color:#c9c0b2;">
                  ${pieContacto()}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function pTitulo(texto: string) {
  return `<h1 style="margin:0 0 12px; font-family:${FONT_SERIF}; font-size:22px; font-weight:600; color:${C.ink};">${texto}</h1>`;
}
function pCuerpo(texto: string) {
  return `<p style="margin:0 0 16px; font-family:${FONT_SANS}; font-size:14px; line-height:1.6; color:${C.body};">${texto}</p>`;
}
function pNota(texto: string) {
  return `<p style="margin:20px 0 0; font-family:${FONT_SANS}; font-size:13px; line-height:1.5; color:${C.muted};">${texto}</p>`;
}
function firma() {
  return `<p style="margin:24px 0 0; font-family:${FONT_SANS}; font-size:13px; color:${C.muted};">— Carmen Machado</p>`;
}

export async function enviarLinkDescarga({
  email,
  nombre,
  titulo,
  token,
}: {
  email: string;
  nombre: string;
  titulo: string;
  token: string;
}) {
  const enlace = urlOrden(token);
  const html = emailShell({
    eyebrowTexto: "Pago confirmado",
    cuerpoHtml:
      pTitulo("¡Tu descarga está lista!") +
      pCuerpo(`Hola ${nombre}, confirmé tu pago de <strong>${titulo}</strong>. Ya puedes descargarlo:`) +
      `<div style="margin:8px 0 4px;">${boton(enlace, "Descargar ahora")}</div>` +
      pNota("Guarda este correo: el enlace te permite volver a descargarlo hasta 5 veces.") +
      firma(),
  });
  const text =
    `¡Tu descarga está lista!\n\n` +
    `Hola ${nombre}, confirmé tu pago de ${titulo}. Descárgalo aquí:\n${enlace}\n\n` +
    `Guarda este correo: el enlace te permite volver a descargarlo hasta 5 veces.\n\n` +
    `— Carmen Machado\n${pieContactoTexto()}`;

  try {
    await resend.emails.send({ from: FROM, to: email, subject: `Tu descarga está lista: ${titulo}`, html, text });
  } catch (err) {
    console.error("[email] No se pudo enviar el link de descarga:", err);
  }
}

export async function enviarOrdenRecibida({
  email,
  nombre,
  titulo,
}: {
  email: string;
  nombre: string;
  titulo: string;
}) {
  const html = emailShell({
    eyebrowTexto: "Comprobante recibido",
    cuerpoHtml:
      pTitulo("Recibí tu comprobante") +
      pCuerpo(
        `Hola ${nombre}, recibí tu comprobante de pago por <strong>${titulo}</strong>. ` +
          `Voy a validarlo y te aviso por este mismo correo apenas confirme el pago, para que puedas descargarlo.`,
      ) +
      firma(),
  });
  const text =
    `Recibí tu comprobante\n\n` +
    `Hola ${nombre}, recibí tu comprobante de pago por ${titulo}. Voy a validarlo y te aviso por correo apenas confirme el pago.\n\n` +
    `— Carmen Machado\n${pieContactoTexto()}`;

  try {
    await resend.emails.send({ from: FROM, to: email, subject: `Recibí tu comprobante: ${titulo}`, html, text });
  } catch (err) {
    console.error("[email] No se pudo enviar el aviso de orden recibida:", err);
  }
}

export async function notificarAdminNuevaOrden({
  titulo,
  nombre,
  email,
  referencia,
}: {
  titulo: string;
  nombre: string;
  email: string;
  referencia: string | null;
}) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return;

  const html = emailShell({
    eyebrowTexto: "Nueva orden",
    cuerpoHtml:
      pTitulo("Nueva orden de pago móvil") +
      pCuerpo(`<strong>Recurso:</strong> ${titulo}`) +
      pCuerpo(`<strong>Comprador:</strong> ${nombre} (${email})`) +
      pCuerpo(`<strong>Referencia:</strong> ${referencia ?? "—"}`) +
      pNota("Revísala en el panel de administración para confirmar o rechazar el pago."),
  });
  const text =
    `Nueva orden de pago móvil\n\n` +
    `Recurso: ${titulo}\nComprador: ${nombre} (${email})\nReferencia: ${referencia ?? "—"}\n\n` +
    `Revísala en el panel de administración para confirmar o rechazar el pago.`;

  try {
    await resend.emails.send({ from: FROM, to: adminEmail, subject: `Nueva orden por validar: ${titulo}`, html, text });
  } catch (err) {
    console.error("[email] No se pudo notificar al admin de la nueva orden:", err);
  }
}
