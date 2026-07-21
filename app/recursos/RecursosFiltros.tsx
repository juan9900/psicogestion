"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RECURSOS_CATEGORIAS } from "@/lib/recursos-categorias";

const select =
  "rounded-[10px] border border-line-2 px-[13px] py-[10px] text-[14px] text-ink outline-none focus:border-brand";

export function RecursosFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  // El buscador escribe la URL con debounce; el resto de los filtros
  // actualizan de inmediato al cambiar.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setParam("q", q), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por título o descripción…"
        className={select}
      />
      <select
        value={searchParams.get("categoria") ?? ""}
        onChange={(e) => setParam("categoria", e.target.value)}
        className={select}
      >
        <option value="">Todas las categorías</option>
        {RECURSOS_CATEGORIAS.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={searchParams.get("tipo") ?? ""}
        onChange={(e) => setParam("tipo", e.target.value)}
        className={select}
      >
        <option value="">Todos los tipos</option>
        <option value="unico">Archivo único</option>
        <option value="pack">Pack de archivos</option>
      </select>
      <select
        value={searchParams.get("orden") ?? "destacados"}
        onChange={(e) => setParam("orden", e.target.value)}
        className={select}
      >
        <option value="destacados">Destacados</option>
        <option value="precio_asc">Precio: menor a mayor</option>
        <option value="precio_desc">Precio: mayor a menor</option>
        <option value="recientes">Más recientes</option>
      </select>
    </div>
  );
}
