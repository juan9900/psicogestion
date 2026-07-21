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
      layout.tsx, page.tsx (dashboard), citas/, ordenes/, pagos/, recursos/,
      analisis/                       gráficas y KPIs de citas + tienda
  recursos/
    page.tsx                        vitrina de recursos activos, con filtros/orden por searchParams
    filtros.ts                      parseo puro de searchParams -> filtros + mapeo a query Supabase
    RecursosFiltros.tsx             barra de filtros ("use client", escribe la URL)
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
  `recursos-imagenes`, activo, orden, **categoria** — texto libre, lista de
  valores permitidos fija en `lib/recursos-categorias.ts`, sin CHECK en BD
  para poder ampliarla sin migración).
- **`ordenes`**: compras. Campos clave: `metodo_pago` (paypal/pago_movil/usdt),
  `estado` (pendiente → pagada/rechazada → entregada), `token_descarga` (uuid,
  único, capability del comprador), `descargas`/`max_descargas` (límite 5),
  `comprobante_path` (bucket privado `comprobantes`, solo pago móvil).
- **`config_pago`**: datos de cobro de Pago Móvil (singleton id=1), editable
  por admin, legible públicamente (se muestra en el checkout).
- **`administradores`**: `user_id` → quién es admin.
- **`citas`**, **`config_agenda`**, **`franjas_disponibilidad`**,
  **`dias_bloqueados`**: sistema de agenda (fuera del alcance de este doc de
  tienda; ver migraciones `agenda.sql`). `citas` además tiene pago propio
  (`monto`, `metodo_pago` — enum `metodo_pago_cita`, `pagado`) y tracking de
  reagendamiento (`veces_reagendada`, `ultima_reagendacion`, ver
  `20260720000000_citas_reagendamiento.sql`): reagendar solo mueve
  fecha/hora, no registra montos.

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
`crear_cita(...)` (email normalizado `lower(trim(...))`, igual que
`crear_orden`). También `reagendar_cita(id, fecha, hora)`
(`20260720000000_citas_reagendamiento.sql`): mueve la cita e incrementa
`veces_reagendada` de forma atómica (evita el `col = col + 1` que PostgREST
no permite en un `update` simple).

## Seguridad y confidencialidad

Modelo (auditado 2026-07-20; los datos sensibles son PII de pacientes en
`citas` — incluido `motivo`, dato de salud — y PII + pago de compradores en
`ordenes`):

- **RLS admin-only en lo sensible**: `citas`, `ordenes`, `administradores` y
  `dias_bloqueados` no tienen ninguna política de lectura pública; solo
  `es_admin()`. `dias_bloqueados` dejó de ser legible por anon en
  `20260721000000_hardening_funciones.sql` porque su `motivo` puede ser
  personal y el sitio público no la consulta (la disponibilidad sale de la
  RPC `horarios_disponibles`).
- **El público solo pasa por RPCs `SECURITY DEFINER`** con `set search_path`,
  que exponen columnas mínimas y validan en servidor (precio desde la BD,
  disponibilidad del slot).
- **Regla obligatoria**: Postgres concede `EXECUTE` a `PUBLIC` por defecto,
  así que **toda función nueva debe incluir su bloque `revoke execute` +
  `grant` explícito** (patrón de `20260718120500_hardening.sql` y
  `20260721000000_hardening_funciones.sql`). Omitirlo dejó `reagendar_cita`
  invocable por anon durante un día; ahora exige `es_admin()` internamente y
  solo `authenticated` puede ejecutarla. `supabase/migraciones.test.ts` hace
  cumplir la regla en CI.
- **Archivos**: buckets `recursos` y `comprobantes` privados; descarga solo
  vía `/api/descargar/[token]` (token + estado pagada + límite de descargas +
  signed URL de 60s). Comprobantes: el público solo puede subir (insert);
  solo admin lee.
- **Secretos**: `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` y
  `PAYPAL_CLIENT_SECRET` viven solo en código de servidor; `.env*` está en
  `.gitignore` (solo `.env.example` con placeholders se versiona).
- **Pendiente manual**: activar *leaked password protection* en el dashboard
  de Supabase (Auth → Passwords), señalado por el advisor de seguridad.

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

## Filtros y tablas ordenables

No hay un componente `<DataTable>` genérico a propósito: las tres vistas
tienen columnas, filtros y formularios embebidos distintos, así que solo se
comparte lo que es realmente idéntico entre ellas.

- **`lib/tablas.ts`**: helper puro de orden (`toggleDir`, `sortBy`) usado por
  las tablas de admin. Sin dependencias de React ni Supabase — testeable
  directo.
- **`/recursos`** (público): `app/recursos/filtros.ts` parsea los
  `searchParams` (`q`, `categoria`, `tipo`, `orden`) y los traduce a filtros
  de la query de Supabase (`.eq`, `.in`, `.or(ilike...)`, `.order`).
  `RecursosFiltros.tsx` es un `"use client"` que lee/escribe esos params en
  la URL (`router.replace`, buscador con debounce). El filtro "tipo de
  contenido" (archivo único vs pack) es derivado de `archivo_tipo`
  (`pdf` vs `zip`/`rar`), no una columna nueva.
- **`/admin/ordenes`**: `OrdenesTabla.tsx` (`"use client"`) recibe las filas
  ya resueltas por el server component (`page.tsx`, incluidas las URLs
  firmadas de `comprobante_path`) y aplica filtro/orden en memoria vía
  `app/admin/(panel)/ordenes/ordenes-filtros.ts`. Los formularios de cambio
  de estado (`actualizarEstadoOrden`) siguen siendo server actions
  embebidas, igual que antes.
- **`/admin/citas`**: `CalendarView.tsx` (calendario mensual) usa un layout
  estilo Google Calendar — el número del día va arriba a la izquierda y,
  dentro de la misma celda, hasta 3 "chips" con las agendas del día
  (hora + nombre truncado, coloreados por `estado`: check verde =
  confirmada, punto ámbar = pendiente, tachado gris = cancelada; ícono de
  persona si `modalidad = presencial`). Si sobran citas aparece "+N más".
  Click en el fondo de la celda o en "+N más" abre un **modal del día**
  (`Modal.tsx`, con scroll vertical) listando todas las agendas; click en un
  chip (desde la celda o el modal del día) abre un **modal de detalle** de
  esa cita, con las acciones Confirmar/Cancelar (`actualizarEstadoCita`) y
  **Reagendar** — revela un formulario con `<input type="date">`/`time"` que
  llama a la nueva server action `reagendarCita` (actualiza `fecha`/`hora`).
  No hay panel de detalle inline debajo del calendario: todo vive en los
  modales. `components/admin/Modal.tsx` es el overlay reutilizable
  (`fixed inset-0` + backdrop + cierre con Escape/click fuera/✕), siguiendo
  el mismo patrón manual que ya usaba `AdminShell.tsx` — el proyecto no tiene
  librería de diálogos. Los botones "Guardar" de los formularios dentro de
  los modales usan un `BotonSubmit` genérico (`useFormStatus` de
  `react-dom`) que se deshabilita y muestra un spinner mientras la server
  action está en curso.
  `components/admin/CitasTabla.tsx` es un componente **hermano**, renderizado
  debajo por `citas/page.tsx`, que muestra todas las citas ordenadas por
  fecha. Por defecto oculta las `cancelada` (filtro "Confirmadas y
  pendientes"), con opción de ver todas o filtrar por estado/modalidad.
  Lógica pura (filtros de tabla + `citasDelDia`/`resumenDia` para el
  calendario) en `components/admin/citas-filtros.ts`.
  - **Agendar manualmente**: botón "+ Agendar" sobre el calendario abre un
    modal con un formulario (nombre, fecha, hora, modalidad, email,
    teléfono, motivo) que llama a la server action `crearCitaManual`. A
    diferencia del formulario público (RPC `crear_cita`), inserta
    directamente en `public.citas` sin validar contra los horarios
    configurados — el admin puede coordinar una cita a cualquier hora; solo
    la mantiene el índice único `(fecha, hora)` de citas activas. La cita
    manual queda `confirmada` de una vez.
  - **Pago de la cita**: columnas nuevas en `citas` — `monto numeric`,
    `metodo_pago metodo_pago_cita` (enum propio: `binance`, `efectivo`,
    `pago_movil`, `zelle`; no se reutiliza el enum `metodo_pago` de la
    tienda) y `pagado boolean` (migración
    `supabase/migrations/20260718121000_citas_pago.sql`). El modal de
    detalle de cada cita tiene una sección "Pago" con formulario (monto,
    método, checkbox "pagado") que llama a `guardarPagoCita`. Cuando
    `pagado = true`, aparece un badge "Pagado" en el modal y un pequeño
    ícono `$` en el chip del calendario, junto al de modalidad presencial.
    Etiquetas legibles vía `METODOS_PAGO_CITA`/`etiquetaMetodoPago` en
    `components/admin/citas-filtros.ts`. La tabla `CitasTabla` tiene además
    una columna **Pagado** (ordenable) con un chip-toggle que llama a la
    server action `alternarPagadoCita` — invierte solo el campo `pagado` sin
    tocar `monto`/`metodo_pago`, para marcar/desmarcar el pago de un clic sin
    abrir el modal.
  - **Editar datos**: el modal de detalle tiene una sección `EdicionCita` que
    permite editar nombre, modalidad, email, teléfono y motivo vía la server
    action `actualizarDatosCita` (fecha/hora siguen por Reagendar, que registra
    el tracking). El modal deriva la cita por `id` del prop fresco de `citas`
    (no guarda el objeto), así refleja ediciones/pago/reagendado tras revalidar
    sin necesidad de reabrirlo.
  - **Cancelar cita**: el botón "Cancelar" (tanto en la tabla como en el modal
    de detalle) abre un diálogo de confirmación (`BotonCancelarCita`, reusa
    `Modal`) antes de llamar a `actualizarEstadoCita` con `estado=cancelada`;
    evita cancelaciones accidentales de una acción destructiva.

## Análisis (`/admin/analisis`)

Vista con KPIs y gráficas (Recharts, primera dependencia de charting del
proyecto) para ver el negocio de un vistazo. Sigue el mismo split que el
resto del panel: agregación pura y testeable separada de la página server
component y del componente cliente que dibuja.

- **`analisis-datos.ts`**: funciones puras (sin React/Supabase) que reciben
  las filas crudas de `citas`/`ordenes`/`recursos` y devuelven resúmenes:
  - `resumenCitas`: total, por estado (pendiente/confirmada/cancelada),
    **reagendadas** (`veces_reagendada > 0`), por modalidad, e ingresos de
    citas (`monto` sumado donde `pagado = true`).
  - `resumenTienda`: ventas e ingresos de `ordenes` en estado `pagada` o
    `entregada` (las únicas que cuentan como venta confirmada), agrupados
    también por método de pago y por categoría del recurso.
  - `serieMensual`: puntos por mes (`YYYY-MM`) con `citas`/`ingresosCitas` y
    `ventas`/`ingresosTienda` **separados** — citas y recursos son negocios
    distintos y no se combinan en una misma serie/gráfica.
  - `topRecursos`: ranking de recursos por ventas/ingresos.
  Tests co-locados en `analisis-datos.test.ts`.
- **`page.tsx`**: server component (`force-dynamic`), trae las tres tablas en
  paralelo (sin filtrar por fecha — analiza el histórico completo) y le pasa
  los resúmenes ya calculados a `AnalisisCharts`. PostgREST no soporta
  `SUM`/`GROUP BY` vía el cliente JS, así que la suma ocurre en JS sobre las
  filas traídas (mismo enfoque que ya usan las tarjetas de `page.tsx` del
  Resumen).
- **`AnalisisCharts.tsx`** (`"use client"`): tarjetas de KPIs + gráficas —
  líneas de citas y de ventas de recursos por mes en gráficas separadas,
  barras de ingresos de citas e ingresos de recursos también separadas,
  donas de estado/modalidad de citas, barras de ingresos por método de pago
  y por categoría, barras del top de recursos — estilizadas con los tokens
  de marca (`brand`/`sand`/`line`). Cada gráfica vive en un contenedor
  `overflow-x-auto` para no romper el ancho en móvil.
- **Ingresos totales** = ingresos de la tienda (`ordenes` pagada/entregada) +
  ingresos de citas pagadas — ambos en USD, sin conversión de moneda.
- **Importante:** "reagendadas" solo cuenta desde que se agregó el tracking
  (`veces_reagendada`/`ultima_reagendacion`, ver arriba); reagendamientos
  anteriores a esa migración no quedan reflejados, porque no dejaban rastro.

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
`components/tienda/EstadoOrdenWatcher.test.tsx`,
`lib/tablas.test.ts`, `app/recursos/filtros.test.ts`,
`app/admin/(panel)/ordenes/ordenes-filtros.test.ts`,
`components/admin/citas-filtros.test.ts`.

Regla de trabajo (ver `CLAUDE.md`): cada feature agrega sus tests; la suite
completa se corre **una sola vez** al terminar la tarea, no en cada paso.
