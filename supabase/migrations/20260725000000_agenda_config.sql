-- Agenda configurable: duración variable por cita, horas laborales por modalidad,
-- bloqueos por rango de días, y disponibilidad consciente del solapamiento.
-- Idempotente: columnas con `if not exists`, enums/constraints protegidos.

-- 1) Duración propia de cada cita (el admin puede agendar sesiones más largas).
--    Las citas existentes quedan en 60 (la duración global previa).
alter table public.citas add column if not exists duracion_min int not null default 60
  check (duracion_min between 5 and 480);

-- 2) Horas laborales por modalidad: una franja puede aplicar a ambas modalidades
--    (modalidad null) o solo a online/presencial. Se rehace la unicidad para
--    permitir la misma franja en distinta modalidad (null se trata como 'ambas').
alter table public.franjas_disponibilidad add column if not exists modalidad modalidad_cita;
alter table public.franjas_disponibilidad drop constraint if exists uq_franja;
drop index if exists public.uq_franja;
-- Dos índices parciales en vez de coalesce(modalidad::text,...): el cast de enum
-- a text no es IMMUTABLE y no se puede usar en una expresión de índice.
create unique index if not exists uq_franja_mod
  on public.franjas_disponibilidad (dia_semana, hora_inicio, hora_fin, modalidad)
  where modalidad is not null;
create unique index if not exists uq_franja_ambas
  on public.franjas_disponibilidad (dia_semana, hora_inicio, hora_fin)
  where modalidad is null;

-- 3) Bloqueos por rango de días: fecha_fin null = un solo día.
alter table public.dias_bloqueados add column if not exists fecha_fin date;
alter table public.dias_bloqueados drop constraint if exists dias_bloqueados_rango_fechas;
alter table public.dias_bloqueados add constraint dias_bloqueados_rango_fechas
  check (fecha_fin is null or fecha_fin >= fecha);

-- 4) horarios_disponibles gana un parámetro de modalidad y pasa a excluir por
--    SOLAPAMIENTO (no solo coincidencia exacta), para respetar las citas largas.
--    Se elimina el overload de 1 parámetro para no dejar dos versiones.
drop function if exists public.horarios_disponibles(date);

create or replace function public.horarios_disponibles(
  p_fecha date,
  p_modalidad modalidad_cita default null
)
returns table (hora time)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_dow smallint := extract(dow from p_fecha)::smallint;
  v_dur int;
  v_tz  text;
begin
  select duracion_cita_min, zona_horaria into v_dur, v_tz
  from public.config_agenda where id = 1;
  v_dur := coalesce(v_dur, 60);
  v_tz  := coalesce(v_tz, 'America/Caracas');

  return query
  with slots as (
    select gs::time as h
    from public.franjas_disponibilidad f
    cross join lateral generate_series(
      (p_fecha + f.hora_inicio),
      (p_fecha + f.hora_fin) - make_interval(mins => v_dur),
      make_interval(mins => v_dur)
    ) gs
    where f.dia_semana = v_dow
      -- franjas de la modalidad pedida, o que aplican a ambas (modalidad null)
      and (p_modalidad is null or f.modalidad is null or f.modalidad = p_modalidad)
  )
  select s.h
  from slots s
  where
    -- descartar horas ya pasadas cuando la fecha es hoy (según la zona horaria)
    ((p_fecha + s.h) at time zone v_tz) > now()
    -- no bloqueadas: el bloqueo cubre la fecha (rango con fecha_fin) y, si define
    -- horas, la hora del slot cae dentro; si no define horas, es día completo.
    and not exists (
      select 1 from public.dias_bloqueados d
      where d.fecha <= p_fecha
        and coalesce(d.fecha_fin, d.fecha) >= p_fecha
        and (
          (d.hora_inicio is null and d.hora_fin is null)
          or (s.h >= d.hora_inicio and s.h < d.hora_fin)
        )
    )
    -- no ocupadas: se excluye el slot si SOLAPA con una cita activa, considerando
    -- la duración de la cita (una sesión larga bloquea los slots que cubre).
    -- Aritmética con timestamp para no envolver en medianoche.
    and not exists (
      select 1 from public.citas c
      where c.fecha = p_fecha and c.estado <> 'cancelada'
        and (p_fecha + c.hora) < (p_fecha + s.h) + make_interval(mins => v_dur)
        and (p_fecha + c.hora) + make_interval(mins => c.duracion_min) > (p_fecha + s.h)
    )
  order by s.h;
end;
$$;

revoke execute on function public.horarios_disponibles(date, modalidad_cita) from public;
grant execute on function public.horarios_disponibles(date, modalidad_cita) to anon, authenticated;

-- 5) crear_cita: valida contra la disponibilidad de la modalidad elegida y guarda
--    la duración por defecto de la config (para que la cita pública ocupe el span
--    correcto). Misma firma de 9 parámetros; se conserva su revoke/grant.
create or replace function public.crear_cita(
  p_fecha date,
  p_hora time,
  p_modalidad modalidad_cita,
  p_nombre text,
  p_email text default null,
  p_telefono text default null,
  p_motivo text default null,
  p_canal text default null,
  p_ubicacion text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_dur int;
begin
  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'El nombre es obligatorio';
  end if;

  if not exists (
    select 1 from public.horarios_disponibles(p_fecha, p_modalidad) h where h.hora = p_hora
  ) then
    raise exception 'La hora seleccionada ya no está disponible';
  end if;

  select coalesce(duracion_cita_min, 60) into v_dur from public.config_agenda where id = 1;
  v_dur := coalesce(v_dur, 60);

  insert into public.citas (fecha, hora, modalidad, nombre, email, telefono, motivo, canal, ubicacion, duracion_min)
  values (
    p_fecha,
    p_hora,
    p_modalidad,
    trim(p_nombre),
    nullif(lower(trim(p_email)), ''),
    p_telefono,
    p_motivo,
    nullif(trim(p_canal), ''),
    nullif(trim(p_ubicacion), ''),
    v_dur
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'La hora seleccionada acaba de ser tomada';
end;
$$;

revoke execute on function public.crear_cita(date, time, modalidad_cita, text, text, text, text, text, text) from public;
grant execute on function public.crear_cita(date, time, modalidad_cita, text, text, text, text, text, text) to anon, authenticated;
