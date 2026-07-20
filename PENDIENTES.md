# Pendientes — tienda de recursos + correos

Lo implementado ya está en el código y las migraciones aplicadas en Supabase.
Esto es lo que falta de tu lado para que funcione en real.

## 1. Variables de entorno (`.env.local`)

Agrega estas variables (algunas ya están documentadas en `.env.example`):

- [ ] `SUPABASE_SERVICE_ROLE_KEY` — Settings → API en tu panel de Supabase. Sin
      esto, el checkout de PayPal y la descarga por token no funcionan.
- [ ] `RESEND_API_KEY` — de tu cuenta en resend.com.
- [ ] `EMAIL_FROM` — usa `onboarding@resend.dev` mientras no tengas dominio propio.
- [ ] `ADMIN_EMAIL` — tu correo, para recibir el aviso de cada orden nueva de pago móvil.
- [ ] `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` en local; el dominio real en producción.

## 2. Cuenta de Resend

- [ ] Crear cuenta en [resend.com](https://resend.com) y generar la API key.
- [ ] ⚠️ Sin dominio verificado, Resend **solo permite enviar correos a la
      dirección con la que te registraste**. Sirve para probar el flujo
      completo, pero no para vender a compradores reales.
- [ ] Cuando tengas dominio propio: verificarlo en Resend y cambiar `EMAIL_FROM`
      a algo como `ventas@tudominio.com`.

## 3. Probar el flujo end-to-end

- [ ] Pago móvil: comprar, subir comprobante → revisar que llega el correo
      "orden recibida" y el aviso a `ADMIN_EMAIL`.
- [ ] Confirmar esa orden desde `/admin/ordenes` → revisar que llega el correo
      con el link de descarga y que la descarga funciona.
- [ ] PayPal (sandbox): completar una compra → revisar redirección a la orden
      y llegada del correo.

## 4. Antes de producción (no urgente, pero a tener en cuenta)

- [ ] Cambiar `PAYPAL_API_BASE` a `https://api-m.paypal.com` y usar
      credenciales live de PayPal (hoy está en sandbox).
- [ ] Considerar un webhook de PayPal como respaldo: si el comprador cierra el
      navegador justo después de aprobar el pago pero antes de que se complete
      el `capture`, la orden podría no registrarse.
- [ ] Habilitar "Leaked Password Protection" en Supabase Auth (advisor de
      seguridad, afecta solo al login de admin).
