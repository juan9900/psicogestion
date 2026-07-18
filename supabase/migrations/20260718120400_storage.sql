-- Buckets de almacenamiento (Supabase Storage). Específico de Supabase:
-- omitir o adaptar si se migra a un Postgres sin la extensión de Storage.

insert into storage.buckets (id, name, public)
values
  ('recursos',          'recursos',          false),  -- PDFs privados; entrega por URL firmada
  ('comprobantes',      'comprobantes',      false),  -- comprobantes de pago de los compradores
  ('recursos-imagenes', 'recursos-imagenes', true)    -- portadas públicas
on conflict (id) do nothing;

-- Portadas: lectura pública.
create policy "imagenes recursos lectura publica" on storage.objects
  for select using (bucket_id = 'recursos-imagenes');

create policy "admin gestiona imagenes" on storage.objects
  for all using (bucket_id = 'recursos-imagenes' and public.es_admin())
  with check (bucket_id = 'recursos-imagenes' and public.es_admin());

-- Comprobantes: cualquiera puede subir; solo el admin los lee.
create policy "subir comprobante" on storage.objects
  for insert with check (bucket_id = 'comprobantes');

create policy "admin lee comprobantes" on storage.objects
  for select using (bucket_id = 'comprobantes' and public.es_admin());

-- Recursos (PDFs): solo el admin gestiona. La entrega al comprador se hace con
-- URL firmada generada desde el servidor, así que no hace falta lectura pública.
create policy "admin gestiona recursos" on storage.objects
  for all using (bucket_id = 'recursos' and public.es_admin())
  with check (bucket_id = 'recursos' and public.es_admin());
