# Psico.Gestión — Sitio web de Carmen Machado

Sitio web de **Carmen Machado**, psicóloga clínica en Maracaibo, Venezuela.
El proyecto tendrá dos partes: una **landing** pública (esta primera fase) y,
más adelante, un **panel de administración** con base de datos en Supabase.

## Estado

- ✅ **Landing** — recreada a partir del diseño de referencia (alta fidelidad).
- ⬜ **Supabase** — base de datos, persistencia de solicitudes de cita y auth.
- ⬜ **Admin dashboard** — gestión de citas, disponibilidad y recursos.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens de diseño en `app/globals.css`)
- Fuentes: **Newsreader** (serif) e **Instrument Sans** (sans) vía `next/font`
- SEO: metadata nativa + datos estructurados `schema.org/Psychologist`

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # build de producción (páginas estáticas)
npm run lint
```

## Estructura

```
app/
  layout.tsx        Fuentes, metadata SEO y JSON-LD (LocalBusiness/Psychologist)
  page.tsx          Composición de la landing
  globals.css       Tokens de diseño (colores, tipografía, sombras)
components/
  Nav.tsx           Barra de navegación + CTA
  Hero.tsx          Sección principal (#inicio)
  About.tsx         "Hola, soy Carmen" (#sobre)
  Specialties.tsx   Acordeón de especialidades (client)
  BookingSection.tsx Formulario conversacional de agendar (client, #agendar)
  Resources.tsx     Tarjeta de plantillas/recursos (#recursos)
  Footer.tsx        Pie con datos de contacto
  Wordmark.tsx      Logotipo tipográfico "Psico.Gestión"
  ImagePlaceholder.tsx  Placeholder rayado (reemplazar por fotos reales)
lib/
  site.ts           Datos del sitio (contacto, enlaces de nav)
```

## Pendientes de contenido (placeholders)

- **Fotos reales**: retrato de Carmen (hero 4:5 y sobre mí vertical) e imagen
  de la tarjeta de recursos (16:10). Hoy son placeholders rayados.
- **Logo**: se usa un wordmark tipográfico; sustituir por el SVG/PNG real.
- **N° de registro profesional**: añadir cuando esté disponible (confianza + SEO).
- **Página de plantillas**: el CTA "Ver plantillas →" apunta a `#recursos`;
  enlazar a su página propia cuando exista.

## Formulario de agendar

Flujo conversacional de 3 pasos (modalidad → fecha/hora → datos) + confirmación.
Las fechas son **dinámicas**: ofrece los próximos días hábiles (lun–vie) desde
hoy. Actualmente el envío es **estado local** (no hay backend); en la fase de
Supabase se persistirá la solicitud y se notificará por correo a Carmen
(ver `TODO(supabase)` en `components/BookingSection.tsx`).
