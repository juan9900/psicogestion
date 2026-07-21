-- Categoría fija (opcional) para filtrar recursos en la vitrina y el panel.
-- La lista de valores permitidos vive en TS (lib/recursos-categorias.ts),
-- no como CHECK, para poder ampliarla sin migración.
alter table public.recursos
  add column if not exists categoria text;

create index if not exists idx_recursos_categoria on public.recursos (categoria);
