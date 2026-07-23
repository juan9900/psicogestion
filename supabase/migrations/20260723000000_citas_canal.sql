-- Canal de adquisición: de dónde llegó la consulta ("¿cómo supiste de mí?").
-- La página de análisis lo usa para mostrar de dónde vienen los pacientes.
-- Idempotente: si la columna ya existe (se aplicó a mano antes), no falla.

alter table public.citas add column if not exists canal text;

-- crear_cita pasa a aceptar p_canal. Agregar un parámetro genera una sobrecarga
-- distinta, así que se elimina la versión de 7 parámetros para no dejar dos.
-- Conserva la normalización de email de 20260721000000_hardening_funciones.
drop function if exists public.crear_cita(date, time, modalidad_cita, text, text, text, text);

create or replace function public.crear_cita(
  p_fecha date,
  p_hora time,
  p_modalidad modalidad_cita,
  p_nombre text,
  p_email text default null,
  p_telefono text default null,
  p_motivo text default null,
  p_canal text default null
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

  insert into public.citas (fecha, hora, modalidad, nombre, email, telefono, motivo, canal)
  values (
    p_fecha,
    p_hora,
    p_modalidad,
    trim(p_nombre),
    nullif(lower(trim(p_email)), ''),
    p_telefono,
    p_motivo,
    nullif(trim(p_canal), '')
  )
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'La hora seleccionada acaba de ser tomada';
end;
$$;

revoke execute on function public.crear_cita(date, time, modalidad_cita, text, text, text, text, text) from public;
grant execute on function public.crear_cita(date, time, modalidad_cita, text, text, text, text, text) to anon, authenticated;
