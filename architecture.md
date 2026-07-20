# Arquitectura — Psico.Gestión

Sitio de Carmen Machado (psicóloga clínica): landing + agenda de citas + tienda
de recursos digitales + panel de administración. Este documento describe el
funcionamiento del sitio y se actualiza en cada feature (ver regla en
`CLAUDE.md`).

## Stack

- **Next.js 16.2.10** (App Router, Turbopack) + **React 19**. Ojo: esta versión
  de Next tiene breaking changes respecto al conocimiento general del modelo
  (ver `AGENTS.md` — consultar `node_modules/next/dist/docs/` antes de tocar
  APIs de framework). Cambios relevantes ya presentes en el código:
  - `middleware.ts` se llama **`proxy.ts`** (exporta `proxy()`, no `middleware()`).
  - `params` de rutas dinámicas es una `Promise` (`await context.params`).
  - `cookies()` de `next/headers` es `async`.
- **Supabase**: Postgres + Auth + Storage + Realtime. Sin backend propio: toda
  la lógica de servidor vive en Route Handlers de Next y en funciones
  Postgres (`SECURITY DEFINER`).
- **Resend**: correos transaccionales.
- **PayPal REST API v2**: pagos automáticos, vía `fetch` directo (sin SDK).
- **Tailwind v4** con tokens de diseño en `app/globals.css` (`@theme`):
  colores `cream`/`sand`/`brand`/`ink`/`body`/`muted`/`line`, tipografías
  `font-serif` (Newsreader) y `font-sans` (Instrument).
- **Vitest** para tests (ver [Testing](#testing)).

## Rutas (`app/`)

```
app/
  page.tsx                          landing (Hero, About, Specialties, Resources, BookingSection)
  admin/
    login/page.tsx                  login de admin (Supabase Auth)
    actions.ts                      server actions del panel ("use server")
    (panel)/                        route group protegido (requiere sesión + es_admin())
      layout.tsx, page.tsx (dashboard), citas/, ordenes/, pagos/, recursos/
  recursos/
    page.tsx                        vitrina de recursos activos
    [slug]/page.tsx                 detalle de un recurso + checkout
    orden/[token]/page.tsx          estado de una orden (comprador anónimo)
  api/
    paypal/create/route.ts          POST — crea orden en PayPal (precio desde BD)
    paypal/capture/route.ts         POST — captura pago, valida monto, inserta orden 'pagada'
    ordenes/pago-movil/route.ts     POST — crea orden 'pendiente' vía RPC crear_orden
    descargar/[token]/route.ts      GET — sirve el archivo vía URL firmada
proxy.ts                            protege /admin/* (redirige a /admin/login sin sesión)
```

## Modelo de auth: dos identidades distintas

- **Admin (Carmen):** Supabase Auth (email/password). `proxy.ts` protege
  `/admin/*` a nivel de sesión; el layout de `(panel)` y cada server action
  llaman `requireAdmin()` (`app/admin/actions.ts`), que además verifica el rol
  vía RPC `es_admin()` (compara `auth.uid()` contra la tabla `administradores`).
- **Comprador:** **sin cuenta**. Su "sesión" es el `token_descarga` (UUID)
  que recibe al comprar — mismo modelo de capability-URL que usa el link de
  descarga y ahora también el canal de Realtime (ver más abajo). Quien tiene
  el token, tiene acceso a esa orden; nadie más.

## Modelo de datos (Supabase)

Migraciones en `supabase/migrations/`, en orden:

- **`recursos`**: catálogo (slug, título, precio_usd, archivo_path/archivo_tipo
  en bucket privado `recursos`, imagen_path en bucket público
  `recursos-imagenes`, activo, orden).
- **`ordenes`**: compras. Campos clave: `metodo_pago` (paypal/pago_movil/usdt),
  `estado` (pendiente → pagada/rechazada → entregada), `token_descarga` (uuid,
  único, capability del comprador), `descargas`/`max_descargas` (límite 5),
  `comprobante_path` (bucket privado `comprobantes`, solo pago móvil).
- **`config_pago`**: datos de cobro de Pago Móvil (singleton id=1), editable
  por admin, legible públicamente (se muestra en el checkout).
- **`administradores`**: `user_id` → quién es admin.
- **`citas`**, **`config_agenda`**, **`franjas_disponibilidad`**,
  **`dias_bloqueados`**: sistema de agenda (fuera del alcance de este doc de
  tienda; ver migraciones `agenda.sql`).

**RLS**: todas las tablas la tienen habilitada. Lectura pública solo en lo
estrictamente necesario (recursos activos, config_agenda/franjas,
config_pago). **`ordenes` NO tiene política de lectura pública** — ni admin ni
anónimo pueden hacer `SELECT` directo salvo `es_admin()`. El comprador
consulta su orden únicamente a través de la RPC `consultar_orden(token)`, que
es `SECURITY DEFINER` y decide qué exponer. Esta restricción es la razón por
la que Realtime no usa `postgres_changes` (ver más abajo).

**RPCs `SECURITY DEFINER`** (`supabase/migrations/20260718120200_funciones.sql`):
`es_admin()`, `crear_orden(...)` (precio siempre tomado de la BD, nunca del
cliente), `consultar_orden(token)`, `horarios_disponibles(fecha)`,
`crear_cita(...)`.

## Flujo de compra

Dos caminos, ambos terminan en `ordenes.estado`:

1. **PayPal (automático):** `CheckoutRecurso.tsx` → `POST /api/paypal/create`
   (crea orden en PayPal con precio de la BD) → SDK de PayPal en el cliente →
   `POST /api/paypal/capture` (captura, **verifica monto/moneda contra la
   BD**, idempotente por `referencia_pago` = capture id) → inserta orden en
   `pagada` → envía correo con el link de descarga.
2. **Pago móvil (manual, Venezuela):** el comprador sube su comprobante a
   Storage y llama `POST /api/ordenes/pago-movil` → RPC `crear_orden` (queda
   `pendiente`) → correo "recibí tu comprobante" al comprador + aviso a
   `ADMIN_EMAIL`. Carmen revisa en `/admin/ordenes` y pulsa **Confirmar
   pago** (única acción manual — `actualizarEstadoOrden` en
   `app/admin/actions.ts`) → `pagada` → correo con el link de descarga.
   (El botón "Marcar entregada" no existe: ver el punto siguiente.)

**Descarga y estado `entregada`:** `GET /api/descargar/[token]` exige estado
`pagada`/`entregada` y `descargas < max_descargas`, genera una URL firmada de
60s del bucket privado `recursos`, incrementa el contador y — desde la
feature de Realtime — **marca la orden como `entregada` en la primera
descarga**. "Entregada" significa "el comprador ya descargó", sin paso manual.

**Página de seguimiento** `app/recursos/orden/[token]/page.tsx`: server
component que llama `consultar_orden(token)` y renderiza tres vistas según
`estado` (éxito / pendiente / rechazada), con CTAs a `/recursos` y `/#agendar`.

## Tiempo real: estado de la orden

La página de orden **no hace polling**. Mientras `estado === "pendiente"`,
`components/tienda/EstadoOrdenWatcher.tsx` (client component) se suscribe a
Supabase Realtime **Broadcast** en el canal `orden-<token_descarga>` y hace
`router.refresh()` en cuanto llega un evento — push, no poll.

Decisión de arquitectura (por qué Broadcast y no `postgres_changes`): dado que
`ordenes` no tiene RLS de lectura pública, exponer los cambios vía
`postgres_changes` exigiría abrir esa política (y filtraría email/monto de
*todas* las órdenes a quien se suscriba). En su lugar, un trigger
(`supabase/migrations/20260718120800_realtime_orden_estado.sql`,
`broadcast_orden_estado()` `AFTER UPDATE OF estado`) llama
`realtime.send()` con un **payload mínimo** (`{estado}`) sobre un **canal
público cuyo topic incluye el token** — la misma capability que ya protege el
link de descarga. Nadie sin el token puede saber a qué canal suscribirse.

Como red de seguridad ante una desconexión de WebSocket no reconectada, el
watcher también hace un `router.refresh()` de respaldo cada 60s mientras esté
`pendiente` (no es la vía principal; antes de esta feature era un
`setInterval` de 15s como único mecanismo — ver `git log` para el contraste).

## Correos (Resend)

`lib/email.ts` — tres funciones, todas **best-effort** (try/catch interno; un
fallo de envío nunca rompe la compra, la orden ya existe en la BD antes de
llamar a esto):

- `enviarLinkDescarga` — al pasar a `pagada` (PayPal o confirmación manual).
- `enviarOrdenRecibida` — al crear una orden de pago móvil.
- `notificarAdminNuevaOrden` — a `ADMIN_EMAIL`, misma orden.

Remitente `EMAIL_FROM` (hoy `onboarding@resend.dev` — sin dominio verificado
en Resend, solo entrega a la dirección con la que se registró la cuenta).

**Plantilla de marca:** el HTML de los tres correos usa una plantilla propia
en `lib/email.ts` (`emailShell` + helpers `wordmark`/`eyebrow`/`boton`) con
la estética del sitio: tarjeta blanca sobre fondo `cream`, wordmark
"Psico.Gestión", una etiqueta de estado tipo badge, botón-píldora verde para
el CTA de descarga, y un pie oscuro con los datos de contacto de
`lib/site.ts`. Construida con **tablas y estilos inline** (no flexbox/CSS
externo — Gmail/Outlook no los soportan de forma confiable) y colores en hex
plano (mismos valores que los tokens de `app/globals.css`, que ahí sí son CSS
variables). Cada envío manda también una versión `text` plana equivalente
(mejor deliverability/accesibilidad).

## Variables de entorno

| Variable | Dónde | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente + server | públicas |
| `SUPABASE_SERVICE_ROLE_KEY` | solo server | salta RLS; usada por `lib/supabase/admin.ts` en las rutas de pago/descarga |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | cliente (SDK) + server (OAuth en `lib/paypal.ts`) | misma var en ambos lados a propósito |
| `PAYPAL_CLIENT_SECRET`, `PAYPAL_API_BASE` | solo server | sandbox por defecto |
| `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL` | solo server | correos |
| `NEXT_PUBLIC_SITE_URL` | server (arma el link de los correos) | debe apuntar al dominio real en producción |

## Testing

**Vitest**, sin nada previo en el proyecto. Config en `vitest.config.ts`
(alias `@/* → raíz`, igual que `tsconfig.json`; entorno por defecto `node`,
más rápido — los archivos que necesitan DOM lo declaran por-archivo con el
docblock `// @vitest-environment jsdom` al inicio, ya que Vitest 4 eliminó
`environmentMatchGlobs`). Setup en `vitest.setup.ts`
(`@testing-library/jest-dom`). Comandos: `npm test` (una corrida) / `npm run
test:watch`.

**Convención:** tests co-locados `*.test.ts(x)` junto al archivo que prueban.
Dependencias externas siempre mockeadas (`vi.mock`): `@/lib/supabase/admin`,
`@/lib/supabase/client`, `resend`, `fetch` global (PayPal). Helper compartido
para mockear el query builder de Supabase: `test/supabaseBuilder.ts`
(`makeBuilder({data, error})` — encadenable y "thenable").

Cobertura actual: `lib/paypal.test.ts`, `lib/email.test.ts`,
`app/api/paypal/capture/route.test.ts`,
`app/api/descargar/[token]/route.test.ts`,
`app/api/ordenes/pago-movil/route.test.ts`,
`components/tienda/EstadoOrdenWatcher.test.tsx`.

Regla de trabajo (ver `CLAUDE.md`): cada feature agrega sus tests; la suite
completa se corre **una sola vez** al terminar la tarea, no en cada paso.
