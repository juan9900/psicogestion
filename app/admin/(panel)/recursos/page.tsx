import { createClient } from "@/lib/supabase/server";
import { guardarRecurso, alternarActivoRecurso } from "../../actions";

export const dynamic = "force-dynamic";

type Recurso = {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string | null;
  precio_usd: number;
  activo: boolean;
};

const inputCls =
  "rounded-[10px] border border-line-2 px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-brand";

export default async function RecursosPage() {
  const supabase = await createClient();
  const { data: recursos } = await supabase
    .from("recursos")
    .select("id, slug, titulo, descripcion, precio_usd, activo")
    .order("orden", { ascending: true })
    .returns<Recurso[]>();

  return (
    <div className="grid gap-8">
      <section>
        <h2 className="mb-4 font-serif text-[26px] text-ink">Recursos</h2>
        <div className="grid gap-3">
          {(recursos ?? []).map((r) => (
            <div key={r.id} className="rounded-[14px] border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <div className="text-[15px] text-ink">
                    {r.titulo}{" "}
                    <span className="text-[14px] text-body">· ${r.precio_usd}</span>
                  </div>
                  <div className="text-[13px] text-muted">/{r.slug}</div>
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
                <summary className="cursor-pointer text-[13px] text-brand">
                  Editar
                </summary>
                <form action={guardarRecurso} className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input name="titulo" defaultValue={r.titulo} placeholder="Título" className={inputCls} />
                  <input name="slug" defaultValue={r.slug} placeholder="slug" className={inputCls} />
                  <input
                    name="precio_usd"
                    type="number"
                    step="0.01"
                    defaultValue={r.precio_usd}
                    placeholder="Precio USD"
                    className={inputCls}
                  />
                  <label className="flex items-center gap-2 text-[14px] text-body">
                    <input type="checkbox" name="activo" defaultChecked={r.activo} /> Activo
                  </label>
                  <textarea
                    name="descripcion"
                    defaultValue={r.descripcion ?? ""}
                    placeholder="Descripción"
                    className={`${inputCls} sm:col-span-2`}
                  />
                  <button className="justify-self-start rounded-full bg-brand px-5 py-2 text-[13px] font-medium text-white hover:brightness-110">
                    Guardar
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      </section>

      {/* NUEVO */}
      <section>
        <h3 className="mb-3 font-serif text-[20px] text-ink">Nuevo recurso</h3>
        <form
          action={guardarRecurso}
          className="grid gap-2 rounded-[14px] border border-line bg-white p-4 sm:grid-cols-2"
        >
          <input name="titulo" required placeholder="Título" className={inputCls} />
          <input name="slug" required placeholder="slug-unico" className={inputCls} />
          <input
            name="precio_usd"
            type="number"
            step="0.01"
            required
            placeholder="Precio USD"
            className={inputCls}
          />
          <label className="flex items-center gap-2 text-[14px] text-body">
            <input type="checkbox" name="activo" defaultChecked /> Activo
          </label>
          <textarea
            name="descripcion"
            placeholder="Descripción"
            className={`${inputCls} sm:col-span-2`}
          />
          <button className="justify-self-start rounded-full bg-brand px-5 py-2 text-[13px] font-medium text-white hover:brightness-110">
            Crear recurso
          </button>
        </form>
        <p className="mt-2 text-[12px] text-muted">
          El archivo PDF se sube por ahora desde Storage en el panel de Supabase (bucket
          <code className="mx-1">recursos</code>).
        </p>
      </section>
    </div>
  );
}
