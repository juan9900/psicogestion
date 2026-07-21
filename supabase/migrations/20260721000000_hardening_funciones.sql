-- Endurecimiento tras la auditoría de seguridad (advisors de Supabase).
--
-- Postgres concede EXECUTE a PUBLIC por defecto en toda función nueva, así que
-- cada función debe traer su bloque revoke/grant (ver 20260718120500_hardening.sql).
-- reagendar_cita (20260720000000) se creó sin ese bloque: cualquier anon podía
-- llamarla vía /rest/v1/rpc y mover una cita conociendo su UUID.

-- 1) reagendar_cita: guard interno de admin + mensaje claro ante conflicto de
--    slot. No valida contra horarios_disponibles a propósito: igual que el alta
--    manual (crearCitaManual), el admin puede coordinar a cualquier hora; el
--    índice único de citas evita duplicar un slot activo.
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
  if not public.es_admin() then
    raise exception 'No autorizado';
  end if;

  update public.citas
  set fecha = p_fecha,
      hora = p_hora,
      veces_reagendada = veces_reagendada + 1,
      ultima_reagendacion = now()
  where id = p_id;
exception
  when unique_violation then
    raise exception 'Ya hay una cita activa en ese horario';
end;
$$;

revoke execute on function public.reagendar_cita(uuid, date, time) from public, anon;
grant execute on function public.reagendar_cita(uuid, date, time) to authenticated;

-- 2) Funciones internas que no son RPC: nadie debe poder invocarlas por REST.
--    broadcast_orden_estado es un trigger; llamarla directo falla igual, pero
--    revocamos por mínimo privilegio.
revoke execute on function public.broadcast_orden_estado() from public, anon, authenticated;

-- rls_auto_enable existe en la base remota pero no en las migraciones locales
-- (drift); se revoca solo si está presente.
do $$
begin
  revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
exception
  when undefined_function then null;
end;
$$;

-- 3) dias_bloqueados: el motivo de un bloqueo puede ser personal y no tiene por
--    qué ser público. Nada del sitio público lee esta tabla (la disponibilidad
--    sale de la RPC horarios_disponibles, que es SECURITY DEFINER); queda solo
--    la política de admin.
drop policy if exists "bloqueos visibles" on public.dias_bloqueados;
revoke select on public.dias_bloqueados from anon;

-- 4) crear_cita: normalizar el email como ya hace crear_orden, para no guardar
--    duplicados por mayúsculas ("Ana@X.com" vs "ana@x.com").
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
  values (p_fecha, p_hora, p_modalidad, trim(p_nombre), nullif(lower(trim(p_email)), ''), p_telefono, p_motivo)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'La hora seleccionada acaba de ser tomada';
end;
$$;
