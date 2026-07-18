-- Row Level Security: el público solo puede lo mínimo; los administradores todo.

alter table public.config_agenda          enable row level security;
alter table public.franjas_disponibilidad enable row level security;
alter table public.dias_bloqueados        enable row level security;
alter table public.citas                  enable row level security;
alter table public.recursos               enable row level security;
alter table public.ordenes                enable row level security;
alter table public.administradores        enable row level security;

-- Lectura pública de la configuración de horarios (no contiene datos personales).
create policy "config visible" on public.config_agenda
  for select using (true);
create policy "franjas visibles" on public.franjas_disponibilidad
  for select using (true);
create policy "bloqueos visibles" on public.dias_bloqueados
  for select using (true);

-- Recursos: el público ve solo los activos.
create policy "recursos activos visibles" on public.recursos
  for select using (activo = true);

-- Citas y órdenes: el público NO lee (datos personales). Se crean vía RPC
-- (crear_cita / crear_orden), que corren con SECURITY DEFINER.

-- Administradores: acceso total a todo.
create policy "admin config" on public.config_agenda
  for all using (public.es_admin()) with check (public.es_admin());
create policy "admin franjas" on public.franjas_disponibilidad
  for all using (public.es_admin()) with check (public.es_admin());
create policy "admin bloqueos" on public.dias_bloqueados
  for all using (public.es_admin()) with check (public.es_admin());
create policy "admin citas" on public.citas
  for all using (public.es_admin()) with check (public.es_admin());
create policy "admin recursos" on public.recursos
  for all using (public.es_admin()) with check (public.es_admin());
create policy "admin ordenes" on public.ordenes
  for all using (public.es_admin()) with check (public.es_admin());
create policy "admin administradores" on public.administradores
  for all using (public.es_admin()) with check (public.es_admin());

-- Permisos base para los roles de Supabase (RLS sigue mandando encima).
grant select on public.config_agenda          to anon, authenticated;
grant select on public.franjas_disponibilidad to anon, authenticated;
grant select on public.dias_bloqueados        to anon, authenticated;
grant select on public.recursos               to anon, authenticated;

grant select, insert, update, delete on
  public.config_agenda, public.franjas_disponibilidad, public.dias_bloqueados,
  public.citas, public.recursos, public.ordenes, public.administradores
  to authenticated;

-- Ejecución de las funciones de negocio.
grant execute on function public.horarios_disponibles(date) to anon, authenticated;
grant execute on function public.crear_cita(date, time, modalidad_cita, text, text, text, text) to anon, authenticated;
grant execute on function public.crear_orden(text, text, text, metodo_pago, text, text) to anon, authenticated;
grant execute on function public.consultar_orden(uuid) to anon, authenticated;
grant execute on function public.es_admin() to authenticated;
