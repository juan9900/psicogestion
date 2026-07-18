-- Funciones de negocio. Se ejecutan con SECURITY DEFINER para validar contra
-- tablas con RLS sin exponer datos personales al público.

-- ¿El usuario autenticado es administrador?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.administradores a where a.user_id = auth.uid());
$$;

-- Horas disponibles para una fecha: genera los slots desde las franjas del día
-- y descuenta los pasados (si es hoy), los bloqueados y los ya ocupados.
create or replace function public.horarios_disponibles(p_fecha date)
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
  )
  select s.h
  from slots s
  where
    -- descartar horas ya pasadas cuando la fecha es hoy (según la zona horaria)
    ((p_fecha + s.h) at time zone v_tz) > now()
    -- no bloqueadas
    and not exists (
      select 1 from public.dias_bloqueados d
      where d.fecha = p_fecha
        and (
          (d.hora_inicio is null and d.hora_fin is null)
          or (s.h >= d.hora_inicio and s.h < d.hora_fin)
        )
    )
    -- no ocupadas por una cita activa
    and not exists (
      select 1 from public.citas c
      where c.fecha = p_fecha and c.hora = s.h and c.estado <> 'cancelada'
    )
  order by s.h;
end;
$$;

-- Crea una cita validando que el slot siga disponible. El índice único hace de
-- red de seguridad ante clics simultáneos.
create or replace function public.crear_cita(
  p_fecha date,
  p_hora time,
  p_modalidad modalidad_cita,
  p_nombre text,
  p_email text default null,
  p_telefono text default null,
  p_motivo text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_nombre is null or length(trim(p_nombre)) = 0 then
    raise exception 'El nombre es obligatorio';
  end if;

  if not exists (
    select 1 from public.horarios_disponibles(p_fecha) h where h.hora = p_hora
  ) then
    raise exception 'La hora seleccionada ya no está disponible';
  end if;

  insert into public.citas (fecha, hora, modalidad, nombre, email, telefono, motivo)
  values (p_fecha, p_hora, p_modalidad, trim(p_nombre), p_email, p_telefono, p_motivo)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'La hora seleccionada acaba de ser tomada';
end;
$$;

-- Crea una orden. El monto SIEMPRE se toma del precio guardado en la base de
-- datos, nunca de lo que envíe el cliente (evita manipulación de precios).
create or replace function public.crear_orden(
  p_recurso_slug text,
  p_nombre text,
  p_email text,
  p_metodo metodo_pago,
  p_referencia text default null,
  p_comprobante_path text default null
)
returns table (orden_id uuid, token_descarga uuid, monto numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recurso public.recursos%rowtype;
  v_id uuid;
  v_token uuid;
begin
  select * into v_recurso from public.recursos
  where slug = p_recurso_slug and activo = true;
  if not found then
    raise exception 'Recurso no disponible';
  end if;
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'El correo es obligatorio';
  end if;

  insert into public.ordenes (
    recurso_id, comprador_nombre, comprador_email, monto, moneda,
    metodo_pago, referencia_pago, comprobante_path
  )
  values (
    v_recurso.id, trim(p_nombre), lower(trim(p_email)), v_recurso.precio_usd, 'USD',
    p_metodo, p_referencia, p_comprobante_path
  )
  returning id, ordenes.token_descarga into v_id, v_token;

  return query select v_id, v_token, v_recurso.precio_usd;
end;
$$;

-- Consulta el estado de una orden por su token (para una página de seguimiento).
create or replace function public.consultar_orden(p_token uuid)
returns table (
  estado estado_orden,
  recurso_titulo text,
  monto numeric,
  moneda text,
  creado timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select o.estado, r.titulo, o.monto, o.moneda, o.created_at
  from public.ordenes o
  join public.recursos r on r.id = o.recurso_id
  where o.token_descarga = p_token;
$$;
