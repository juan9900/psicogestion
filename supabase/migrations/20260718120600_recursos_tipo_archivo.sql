-- Permite que un recurso sea un PDF o un pack comprimido (ZIP/RAR).

alter table public.recursos
  add column if not exists archivo_tipo text
  check (archivo_tipo is null or archivo_tipo in ('pdf', 'zip', 'rar'));
