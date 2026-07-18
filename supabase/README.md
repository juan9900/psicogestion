# Backend (Supabase)

Base de datos de Psico.Gestión: **agenda de consultas** (con bloqueo de horas y
horarios configurables) y **venta de recursos digitales** (PDFs, pago manual por
Pago Móvil / PayPal / USDT con confirmación de comprobante).

Todo el esquema vive en migraciones SQL versionadas (`migrations/`), así que es
portable: si te mudas a otra cuenta de Supabase —o a otro Postgres— aplicas las
mismas migraciones y tienes la base idéntica.

## Estructura

| Archivo | Qué hace |
|---|---|
| `migrations/…_agenda.sql` | Config de horarios, franjas por día, días bloqueados, tabla `citas` + bloqueo de horas (índice único parcial). |
| `migrations/…_recursos.sql` | `recursos` (productos), `ordenes` (compras), `administradores`. |
| `migrations/…_funciones.sql` | Lógica: `horarios_disponibles`, `crear_cita`, `crear_orden`, `consultar_orden`, `es_admin`. |
| `migrations/…_rls.sql` | Row Level Security + permisos. |
| `migrations/…_storage.sql` | Buckets de archivos (PDFs, comprobantes, portadas). |
| `seed.sql` | Datos iniciales: horario Lun–Vie 9–13 y 14–18, un recurso de ejemplo. |

## Crear el proyecto y aplicar las migraciones

1. Crea el proyecto en https://supabase.com (guarda la contraseña de la base).
2. Instala el CLI: `npm i -g supabase` (o `brew install supabase/tap/supabase`).
3. Desde la raíz del repo:
   ```bash
   supabase login
   supabase link --project-ref <TU_PROJECT_REF>
   supabase db push          # aplica las migraciones al proyecto remoto
   ```
   Para cargar los datos de ejemplo (`seed.sql`) en local: `supabase db reset`.

> Alternativa sin CLI: abre el **SQL Editor** de Supabase y pega el contenido de
> cada archivo de `migrations/` **en orden**, y al final `seed.sql`.

## Convertir a Carmen en administradora

Las políticas dan acceso total solo a quienes estén en `administradores`.

1. Crea su cuenta en **Authentication → Users** (o que se registre).
2. Copia su `user_id` (UUID) y ejecuta en el SQL Editor:
   ```sql
   insert into public.administradores (user_id, nombre)
   values ('<UUID_DE_CARMEN>', 'Carmen Machado');
   ```

Mientras tanto, desde el panel de Supabase (Table Editor) se gestiona todo con
la `service_role`, que salta RLS.

## Variables de entorno (para conectar el sitio después)

En Netlify (y en `.env.local` para desarrollo). Ver `.env.example` en la raíz:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo servidor, NUNCA en el cliente
```

## Cómo lo usará el sitio (resumen)

- **Ver horas libres:** `rpc('horarios_disponibles', { p_fecha })` → devuelve solo
  las horas disponibles (nunca datos de otros pacientes).
- **Agendar:** `rpc('crear_cita', { … })` → valida el slot y bloquea la hora.
- **Comprar un recurso:** `rpc('crear_orden', { … })` → el precio lo pone la base
  de datos, no el navegador. Devuelve un `token_descarga`.
- **Entregar el PDF:** tras confirmar el pago, el servidor genera una URL firmada
  temporal del bucket `recursos` y la envía por correo.

## Notas de seguridad

- El **precio** de cada compra se toma del servidor (`crear_orden`), no del cliente.
- Las tablas `citas` y `ordenes` no son legibles por el público: solo se escriben
  vía funciones controladas.
- La `SUPABASE_SERVICE_ROLE_KEY` va **solo** en el servidor (route handlers), nunca
  en componentes del cliente.
