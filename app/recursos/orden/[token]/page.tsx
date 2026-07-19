import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ConsultaOrden = {
  estado: string;
  recurso_titulo: string;
  monto: number;
  moneda: string;
  creado: string;
};

const MENSAJE_ESTADO: Record<string, string> = {
  pendiente: "Estamos esperando la confirmación de tu pago. Te avisaremos por correo apenas se confirme.",
  rechazada: "El pago no pudo confirmarse. Si crees que es un error, escríbenos.",
};

export default async function OrdenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("consultar_orden", { p_token: token })
    .maybeSingle<ConsultaOrden>();

  const disponible = data && ["pagada", "entregada"].includes(data.estado);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-[560px] flex-1 px-6 py-[72px] sm:px-10">
        {!data ? (
          <p className="text-[15px] text-body">No encontramos esa orden.</p>
        ) : (
          <div className="rounded-[18px] border border-line bg-white p-8">
            <h1 className="mb-2 font-serif text-[26px] text-ink">{data.recurso_titulo}</h1>
            <p className="mb-6 text-[14px] text-muted">
              ${data.monto} {data.moneda}
            </p>

            {disponible ? (
              <a
                href={`/api/descargar/${token}`}
                className="inline-block rounded-full bg-brand px-[26px] py-3.5 text-[15px] font-medium text-white transition hover:brightness-110"
              >
                Descargar
              </a>
            ) : (
              <p className="text-[15px] text-body">
                {MENSAJE_ESTADO[data.estado] ?? "Tu orden se está procesando."}
              </p>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
