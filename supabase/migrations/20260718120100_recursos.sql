-- Tienda de recursos digitales (PDFs) y órdenes de compra.

do $$ begin
  create type metodo_pago as enum ('pago_movil', 'paypal', 'usdt');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_orden as enum ('pendiente', 'pagada', 'entregada', 'rechazada');
exception when duplicate_object then null; end $$;

-- Administradores: quién puede gestionar. Se llena con el user_id de Carmen
-- después de crear su cuenta en Supabase Auth (ver supabase/README.md).
create table if not exists public.administradores (
  user_id uuid primary key,
  nombre text,
  created_at timestamptz not null default now()
);

-- Recursos a la venta
create table if not exists public.recursos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  titulo text not null,
  descripcion text,
  precio_usd numeric(10,2) not null check (precio_usd >= 0),
  archivo_path text,          -- ruta en el bucket privado 'recursos'
  imagen_path text,           -- ruta de la portada (bucket 'recursos-imagenes')
  activo boolean not null default true,
  orden int not null default 0,   -- para ordenar en la vitrina
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_recursos_activo on public.recursos (activo);

-- Órdenes de compra
create table if not exists public.ordenes (
  id uuid primary key default gen_random_uuid(),
  recurso_id uuid not null references public.recursos(id) on delete restrict,
  comprador_nombre text not null,
  comprador_email text not null,
  monto numeric(10,2) not null check (monto >= 0),
  moneda text not null default 'USD',
  metodo_pago metodo_pago not null,
  referencia_pago text,          -- nro. de referencia / txid / id de PayPal
  comprobante_path text,         -- comprobante subido al bucket 'comprobantes'
  estado estado_orden not null default 'pendiente',
  token_descarga uuid not null default gen_random_uuid() unique,
  descargas int not null default 0,
  max_descargas int not null default 5,
  notas_admin text,
  created_at timestamptz not null default now(),
  confirmado_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists idx_ordenes_estado on public.ordenes (estado);
create index if not exists idx_ordenes_recurso on public.ordenes (recurso_id);
create index if not exists idx_ordenes_email on public.ordenes (comprador_email);

-- Triggers de updated_at
drop trigger if exists trg_recursos_updated on public.recursos;
create trigger trg_recursos_updated before update on public.recursos
  for each row execute function public.set_updated_at();

drop trigger if exists trg_ordenes_updated on public.ordenes;
create trigger trg_ordenes_updated before update on public.ordenes
  for each row execute function public.set_updated_at();
