-- Registro de pago de las citas: monto cobrado, método y si ya se pagó.
-- Enum propio (no se reutiliza `metodo_pago` de la tienda: valores distintos).

do $$ begin
  create type metodo_pago_cita as enum ('binance', 'efectivo', 'pago_movil', 'zelle');
exception when duplicate_object then null; end $$;

alter table public.citas add column if not exists monto numeric(10,2)
  check (monto is null or monto >= 0);
alter table public.citas add column if not exists metodo_pago metodo_pago_cita;
alter table public.citas add column if not exists pagado boolean not null default false;
