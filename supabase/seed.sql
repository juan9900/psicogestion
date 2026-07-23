-- Datos iniciales (sin datos personales). Se aplican con `supabase db reset`.

-- Configuración de la agenda.
insert into public.config_agenda (id, duracion_cita_min, zona_horaria)
values (1, 60, 'America/Caracas')
on conflict (id) do nothing;

-- Horario laboral por defecto: Lunes a Viernes, 9:00–13:00 y 14:00–18:00.
-- Modalidad null = aplica a ambas (online y presencial). El ON CONFLICT apunta al
-- índice parcial uq_franja_ambas (franjas sin modalidad), de ahí el predicado.
insert into public.franjas_disponibilidad (dia_semana, hora_inicio, hora_fin)
values
  (1, '09:00', '13:00'), (1, '14:00', '18:00'),
  (2, '09:00', '13:00'), (2, '14:00', '18:00'),
  (3, '09:00', '13:00'), (3, '14:00', '18:00'),
  (4, '09:00', '13:00'), (4, '14:00', '18:00'),
  (5, '09:00', '13:00'), (5, '14:00', '18:00')
on conflict (dia_semana, hora_inicio, hora_fin) where modalidad is null do nothing;

-- Recurso de ejemplo (sin archivo aún; el PDF se sube desde el panel de Supabase).
insert into public.recursos (slug, titulo, descripcion, precio_usd, activo, orden)
values
  ('registro-emocional', 'Registro emocional diario',
   'Plantilla en PDF para registrar emociones y pensamientos entre sesiones.',
   5.00, true, 1)
on conflict (slug) do nothing;
