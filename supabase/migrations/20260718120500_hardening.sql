-- Endurecimiento según los advisors de seguridad de Supabase.

-- 1) search_path fijo en set_updated_at (evita "search_path mutable").
alter function public.set_updated_at() set search_path = public;

-- 2) El bucket público 'recursos-imagenes' no necesita una policy de SELECT
--    amplia: los objetos se sirven por su URL pública. Quitarla evita que se
--    pueda listar todo el contenido del bucket.
drop policy if exists "imagenes recursos lectura publica" on storage.objects;

-- 3) Menor privilegio en las funciones: Postgres concede EXECUTE a PUBLIC por
--    defecto. Lo revocamos y otorgamos solo a quien corresponde.
revoke execute on function public.set_updated_at() from public;
revoke execute on function public.es_admin() from public;
revoke execute on function public.horarios_disponibles(date) from public;
revoke execute on function public.crear_cita(date, time, modalidad_cita, text, text, text, text) from public;
revoke execute on function public.crear_orden(text, text, text, metodo_pago, text, text) from public;
revoke execute on function public.consultar_orden(uuid) from public;

-- es_admin solo lo necesitan el rol autenticado y las políticas RLS.
grant execute on function public.es_admin() to authenticated;

-- RPCs públicas de negocio: explícitamente para anon y authenticated.
grant execute on function public.horarios_disponibles(date) to anon, authenticated;
grant execute on function public.crear_cita(date, time, modalidad_cita, text, text, text, text) to anon, authenticated;
grant execute on function public.crear_orden(text, text, text, metodo_pago, text, text) to anon, authenticated;
grant execute on function public.consultar_orden(uuid) to anon, authenticated;
