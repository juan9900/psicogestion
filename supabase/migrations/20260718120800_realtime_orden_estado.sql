-- Notifica en tiempo real el cambio de estado de una orden, sin exponer la
-- tabla 'ordenes' vía postgres_changes (que exigiría RLS de SELECT pública y
-- filtraría email/monto de todas las órdenes) ni broadcast_changes (adjunta
-- la fila completa). En vez de eso: Broadcast manual con un payload mínimo
-- ({estado}) sobre un canal público cuyo topic incluye el token_descarga —
-- el mismo secreto que ya protege el link de descarga.

create or replace function public.broadcast_orden_estado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.estado is distinct from OLD.estado then
    perform realtime.send(
      jsonb_build_object('estado', NEW.estado),
      'estado',
      'orden-' || NEW.token_descarga::text,
      false -- canal público: cualquiera con el token puede suscribirse, nadie más
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_broadcast_orden_estado on public.ordenes;
create trigger trg_broadcast_orden_estado
  after update of estado on public.ordenes
  for each row execute function public.broadcast_orden_estado();
