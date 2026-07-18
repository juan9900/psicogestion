import { createClient } from "@/lib/supabase/server";
import { alternarActivoRecurso } from "../../actions";
import { RecursoForm } from "@/components/admin/RecursoForm";

export const dynamic = "force-dynamic";

type Recurso = {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  precio_usd: number;
  activo: boolean;
  archivo_path: string | null;
  imagen_path: string | null;
};

export default async function RecursosPage() {
  const supabase = await createClient();
  const { data: recursos } = await supabase
    .from("recursos")
    .select("id, slug, titulo, descripcion, precio_usd, activo, archivo_path, imagen_path")
    .order("orden", { ascending: true })
    .returns<Recurso[]>();

  return (
    <div className="grid gap-8">
      <h1 className="font-serif text-[28px] text-ink">Recursos</h1>

      <div className="grid gap-3">
        {(recursos ?? []).map((r) => (
          <div key={r.id} className="rounded-[14px] border border-line bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <div className="text-[15px] text-ink">
                  {r.titulo} <span className="text-[14px] text-body">· ${r.precio_usd}</span>
                </div>
                <div className="text-[13px] text-muted">
                  /{r.slug}
                  {r.archivo_path ? (
                    <span className="ml-2 text-brand-dark">PDF ✓</span>
                  ) : (
                    <span className="ml-2 text-[#a87b25]">sin PDF</span>
                  )}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[12px] ${
                  r.activo ? "bg-brand-tint text-brand-dark" : "bg-[#f0edeb] text-muted"
                }`}
              >
                {r.activo ? "activo" : "oculto"}
              </span>
              <form action={alternarActivoRecurso}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="activo" value={String(r.activo)} />
                <button className="rounded-full border border-line-2 px-3 py-1.5 text-[12px] text-body hover:bg-cream">
                  {r.activo ? "Ocultar" : "Activar"}
                </button>
              </form>
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-[13px] text-brand">Editar</summary>
              <div className="mt-3">
                <RecursoForm recurso={r} />
              </div>
            </details>
          </div>
        ))}
      </div>

      <section>
        <h2 className="mb-3 font-serif text-[20px] text-ink">Nuevo recurso</h2>
        <div className="rounded-[14px] border border-line bg-white p-4">
          <RecursoForm />
        </div>
      </section>
    </div>
  );
}
