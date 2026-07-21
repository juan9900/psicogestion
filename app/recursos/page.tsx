import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { ImagePlaceholder } from "@/components/ImagePlaceholder";
import { createClient } from "@/lib/supabase/server";
import { RecursosFiltros } from "./RecursosFiltros";
import { parseRecursosParams, ordenToQuery, tipoToArchivoTipos, sanitizeQuery } from "./filtros";

export const dynamic = "force-dynamic";

type Recurso = {
  slug: string;
  titulo: string;
  descripcion: string | null;
  precio_usd: number;
  imagen_path: string | null;
  categoria: string | null;
  archivo_tipo: string | null;
};

export default async function RecursosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { q, categoria, tipo, orden } = parseRecursosParams(await searchParams);
  const { column, ascending } = ordenToQuery(orden);

  const supabase = await createClient();
  let query = supabase
    .from("recursos")
    .select("slug, titulo, descripcion, precio_usd, imagen_path, categoria, archivo_tipo, created_at")
    .eq("activo", true);

  if (categoria) query = query.eq("categoria", categoria);
  if (tipo) query = query.in("archivo_tipo", tipoToArchivoTipos(tipo));
  const qLimpio = sanitizeQuery(q);
  if (qLimpio) query = query.or(`titulo.ilike.%${qLimpio}%,descripcion.ilike.%${qLimpio}%`);

  const { data: recursos } = await query.order(column, { ascending }).returns<Recurso[]>();

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-[72px] sm:px-10">
        <h1 className="mb-3.5 font-serif text-[32px] font-normal text-ink">
          Plantillas y recursos para descargar
        </h1>
        <p className="mb-10 text-[16px] leading-[1.6] text-body">
          Registros emocionales, guías y ejercicios en PDF, listos para descargar y trabajar entre sesiones.
        </p>

        <RecursosFiltros />

        {!recursos?.length ? (
          <p className="text-[15px] text-body">
            {q || categoria || tipo
              ? "No encontramos recursos con esos filtros."
              : "Todavía no hay recursos disponibles."}
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {recursos.map((r) => {
              const portada = r.imagen_path
                ? supabase.storage.from("recursos-imagenes").getPublicUrl(r.imagen_path).data.publicUrl
                : null;
              return (
                <Link
                  key={r.slug}
                  href={`/recursos/${r.slug}`}
                  className="group overflow-hidden rounded-[18px] border border-line bg-white transition hover:border-brand"
                >
                  {portada ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={portada}
                      alt={r.titulo}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  ) : (
                    <ImagePlaceholder
                      label={r.titulo}
                      variant="green"
                      className="w-full"
                      style={{ aspectRatio: "16 / 10" }}
                    />
                  )}
                  <div className="p-5">
                    <h2 className="mb-1 text-[17px] text-ink">{r.titulo}</h2>
                    {r.descripcion && (
                      <p className="mb-3 line-clamp-2 text-[13px] text-body">{r.descripcion}</p>
                    )}
                    <span className="text-[15px] font-medium text-brand-dark">${r.precio_usd}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
