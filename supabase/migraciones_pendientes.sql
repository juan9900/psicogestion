-- Migraciones pendientes de aplicar en el proyecto Supabase real
-- (glsoimjgxvcatdywfnco). Pegar todo esto en Supabase → SQL Editor → Run.
--
-- Corresponde a:
--   supabase/migrations/20260718120600_recursos_tipo_archivo.sql
--   supabase/migrations/20260718120700_config_pago.sql

-- ============================================================
-- 1) Permite que un recurso sea un PDF o un pack comprimido (ZIP/RAR).
-- ============================================================
alter table public.recursos
  add column if not exists archivo_tipo text
  check (archivo_tipo is null or archivo_tipo in ('pdf', 'zip', 'rar'));

-- ============================================================
-- 2) Datos de Pago Móvil, editables por el admin y visibles
--    públicamente en el checkout.
-- ============================================================
create table if not exists public.config_pago (
  id int primary key default 1 check (id = 1),
  titular text,
  cedula text,
  telefono text,
  banco text,
  instrucciones text,
  updated_at timestamptz not null default now()
);

insert into public.config_pago (id) values (1) on conflict (id) do nothing;

drop trigger if exists trg_config_pago_updated on public.config_pago;
create trigger trg_config_pago_updated before update on public.config_pago
  for each row execute function public.set_updated_at();

alter table public.config_pago enable row level security;

drop policy if exists "config pago visible" on public.config_pago;
create policy "config pago visible" on public.config_pago
  for select using (true);

drop policy if exists "admin config pago" on public.config_pago;
create policy "admin config pago" on public.config_pago
  for all using (public.es_admin()) with check (public.es_admin());

grant select on public.config_pago to anon, authenticated;
grant select, insert, update, delete on public.config_pago to authenticated;
