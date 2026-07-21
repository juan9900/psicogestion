-- Tracking de reagendamientos: hasta ahora reagendar una cita solo
-- sobreescribía fecha/hora sin dejar rastro. Para poder analizarlo,
-- agregamos un contador y la fecha del último reagendamiento.
-- No recupera reagendamientos pasados; cuenta desde este cambio en adelante.

alter table public.citas
  add column if not exists veces_reagendada integer not null default 0,
  add column if not exists ultima_reagendacion timestamptz;

-- Reagenda una cita de forma atómica: mueve fecha/hora y registra el cambio.
-- SECURITY DEFINER porque el admin opera contra una tabla con RLS.
create or replace function public.reagendar_cita(
  p_id uuid,
  p_fecha date,
  p_hora time
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.citas
  set fecha = p_fecha,
      hora = p_hora,
      veces_reagendada = veces_reagendada + 1,
      ultima_reagendacion = now()
  where id = p_id;
end;
$$;
