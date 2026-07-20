"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mientras la orden esté 'pendiente', escucha en tiempo real el cambio de
// estado (Supabase Realtime Broadcast) y refresca la página apenas llega —
// push en vez de poll. El canal 'orden-<token>' lo emite un trigger en la
// tabla 'ordenes' (ver supabase/migrations/20260718120800_realtime_orden_estado.sql)
// con un payload mínimo ({estado}), sin exponer datos del comprador.
//
// Se mantiene un refresh de respaldo cada 60s, solo por si el WebSocket se
// cae y aún no reconecta — no es la vía principal de actualización.
export function EstadoOrdenWatcher({ estado, token }: { estado: string; token: string }) {
  const router = useRouter();

  useEffect(() => {
    if (estado !== "pendiente") return;

    const supabase = createClient();
    const channel = supabase
      .channel(`orden-${token}`)
      .on("broadcast", { event: "estado" }, () => router.refresh())
      .subscribe();

    const respaldo = setInterval(() => router.refresh(), 60000);

    return () => {
      clearInterval(respaldo);
      supabase.removeChannel(channel);
    };
  }, [estado, token, router]);

  return null;
}
