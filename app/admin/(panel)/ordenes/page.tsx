import { createClient } from "@/lib/supabase/server";
import { OrdenesTabla } from "./OrdenesTabla";
import type { Orden } from "./ordenes-filtros";

export const dynamic = "force-dynamic";

export default async function OrdenesPage() {
  const supabase = await createClient();
  const { data: ordenes } = await supabase
    .from("ordenes")
    .select("*, recursos(titulo)")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<Orden[]>();

  const firmados: Record<string, string> = {};
  await Promise.all(
    (ordenes ?? [])
      .filter((o) => o.comprobante_path)
      .map(async (o) => {
        const { data } = await supabase.storage
          .from("comprobantes")
          .createSignedUrl(o.comprobante_path!, 3600);
        if (data?.signedUrl) firmados[o.id] = data.signedUrl;
      }),
  );

  return (
    <div className="grid gap-5">
      <h1 className="font-serif text-[28px] text-ink">
        Órdenes{" "}
        <span className="text-[16px] text-muted">({ordenes?.length ?? 0})</span>
      </h1>

      {!ordenes?.length ? (
        <p className="text-[15px] text-body">Aún no hay órdenes.</p>
      ) : (
        <OrdenesTabla ordenes={ordenes} firmados={firmados} />
      )}
    </div>
  );
}
