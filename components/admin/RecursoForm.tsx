"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { guardarRecurso } from "@/app/admin/actions";

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

const input =
  "rounded-[10px] border border-line-2 px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-brand";

export function RecursoForm({ recurso }: { recurso?: Recurso }) {
  const supabase = createClient();
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [slug, setSlug] = useState(recurso?.slug ?? "");
  const [estado, setEstado] = useState<"idle" | "subiendo" | "guardando" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const slugVal = String(data.get("slug") ?? "").trim();

    if (!slugVal || !String(data.get("titulo") ?? "").trim()) {
      setEstado("error");
      setMsg("Título y slug son obligatorios.");
      return;
    }

    try {
      // 1) Subir archivos al Storage si se seleccionaron.
      const pdf = pdfRef.current?.files?.[0];
      const img = imgRef.current?.files?.[0];

      if (pdf) {
        setEstado("subiendo");
        setMsg("Subiendo PDF…");
        const { data: up, error } = await supabase.storage
          .from("recursos")
          .upload(`${slugVal}/archivo.pdf`, pdf, { upsert: true, contentType: "application/pdf" });
        if (error) throw error;
        data.set("archivo_path", up.path);
      }

      if (img) {
        setEstado("subiendo");
        setMsg("Subiendo portada…");
        const ext = (img.name.split(".").pop() || "jpg").toLowerCase();
        const { data: up, error } = await supabase.storage
          .from("recursos-imagenes")
          .upload(`${slugVal}/portada.${ext}`, img, { upsert: true });
        if (error) throw error;
        data.set("imagen_path", up.path);
      }

      // 2) Guardar metadatos (Server Action).
      setEstado("guardando");
      setMsg("Guardando…");
      await guardarRecurso(data);

      setEstado("ok");
      setMsg(recurso ? "Cambios guardados." : "Recurso creado.");
      if (!recurso) {
        form.reset();
        setSlug("");
      }
      if (pdfRef.current) pdfRef.current.value = "";
      if (imgRef.current) imgRef.current.value = "";
    } catch (err) {
      setEstado("error");
      setMsg(err instanceof Error ? err.message : "No se pudo guardar.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-2">
      {recurso && <input type="hidden" name="id" value={recurso.id} />}
      <input name="titulo" defaultValue={recurso?.titulo} placeholder="Título" className={input} />
      <input
        name="slug"
        value={slug}
        onChange={(e) => setSlug(e.target.value.replace(/[^a-z0-9-]/g, ""))}
        placeholder="slug-unico"
        className={input}
      />
      <input
        name="precio_usd"
        type="number"
        step="0.01"
        min="0"
        defaultValue={recurso?.precio_usd}
        placeholder="Precio USD"
        className={input}
      />
      <label className="flex items-center gap-2 text-[14px] text-body">
        <input type="checkbox" name="activo" defaultChecked={recurso ? recurso.activo : true} /> Activo
      </label>
      <textarea
        name="descripcion"
        defaultValue={recurso?.descripcion ?? ""}
        placeholder="Descripción"
        className={`${input} sm:col-span-2`}
      />

      <label className="text-[13px] text-body">
        Archivo PDF{recurso?.archivo_path ? " (ya hay uno; subir reemplaza)" : ""}
        <input ref={pdfRef} type="file" accept="application/pdf" className="mt-1 block w-full text-[13px] text-body" />
      </label>
      <label className="text-[13px] text-body">
        Portada (imagen, opcional)
        <input ref={imgRef} type="file" accept="image/*" className="mt-1 block w-full text-[13px] text-body" />
      </label>

      <div className="flex items-center gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={estado === "subiendo" || estado === "guardando"}
          className="rounded-full bg-brand px-5 py-2 text-[13px] font-medium text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {recurso ? "Guardar" : "Crear recurso"}
        </button>
        {msg && (
          <span className={`text-[13px] ${estado === "error" ? "text-[#a33]" : estado === "ok" ? "text-brand-dark" : "text-muted"}`}>
            {msg}
          </span>
        )}
      </div>
    </form>
  );
}
