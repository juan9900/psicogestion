import { notFound } from "next/navigation";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { CheckoutRecurso } from "@/components/tienda/CheckoutRecurso";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Recurso = {
  slug: string;
  titulo: string;
  descripcion: string | null;
  precio_usd: number;
  imagen_path: string | null;
};

type ConfigPago = {
  titular: string | null;
  cedula: string | null;
  telefono: string | null;
  banco: string | null;
  instrucciones: string | null;
};

export default async function RecursoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: recurso } = await supabase
    .from("recursos")
    .select("slug, titulo, descripcion, precio_usd, imagen_path")
    .eq("slug", slug)
    .eq("activo", true)
    .maybeSingle<Recurso>();

  if (!recurso) notFound();

  const { data: configPago } = await supabase
    .from("config_pago")
    .select("titular, cedula, telefono, banco, instrucciones")
    .eq("id", 1)
    .maybeSingle<ConfigPago>();

  const portada = recurso.imagen_path
    ? supabase.storage.from("recursos-imagenes").getPublicUrl(recurso.imagen_path).data.publicUrl
    : null;

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-[72px] sm:px-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            {portada ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={portada} alt={recurso.titulo} className="w-full rounded-[18px] object-cover" style={{ aspectRatio: "16 / 10" }} />
            ) : (
              <ImagePlaceholder
                label={recurso.titulo}
                variant="green"
                className="w-full rounded-[18px]"
                style={{ aspectRatio: "16 / 10" }}
              />
            )}
            <h1 className="mt-6 mb-2 font-serif text-[28px] text-ink">{recurso.titulo}</h1>
            <p className="mb-2 text-[18px] font-medium text-brand-dark">${recurso.precio_usd}</p>
            {recurso.descripcion && (
              <p className="text-[15px] leading-[1.6] text-body">{recurso.descripcion}</p>
            )}
          </div>

          <CheckoutRecurso
            recurso={recurso}
            configPago={configPago ?? null}
            paypalClientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || null}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
