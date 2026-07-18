"use client";

import { useEffect, useState } from "react";
import { SidebarNav } from "./SidebarNav";
import { signOut } from "@/app/admin/actions";

export function AdminShell({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Abierto por defecto en escritorio, cerrado en móvil (tras montar, sin
  // desajuste de hidratación).
  useEffect(() => {
    setOpen(window.matchMedia("(min-width: 640px)").matches);
  }, []);

  const cerrarEnMovil = () => {
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 640px)").matches) {
      setOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Barra superior con el botón toggle */}
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-white px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir o cerrar menú"
          className="grid h-9 w-9 place-items-center rounded-[10px] border border-line-2 text-ink transition hover:bg-cream"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-serif text-[17px] text-ink">Panel de gestión</span>
      </header>

      {/* Fondo oscuro en móvil */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/30 sm:hidden"
          aria-hidden
        />
      )}

      {/* Sidebar (cajón deslizable) */}
      <aside
        className={`fixed left-0 top-0 z-40 h-full w-[240px] border-r border-line bg-white transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col gap-6 p-4 sm:p-5">
          <div className="flex items-start justify-between px-1">
            <div>
              <div className="font-serif text-[19px] text-ink">Psico.Gestión</div>
              <div className="text-[12px] text-muted">Panel de gestión</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-cream"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div onClick={cerrarEnMovil}>
            <SidebarNav />
          </div>

          <form action={signOut} className="mt-auto">
            <div className="mb-2 truncate px-1 text-[12px] text-muted">{email}</div>
            <button className="w-full rounded-[10px] border border-line-2 px-3 py-2 text-left text-[13px] text-body transition hover:bg-cream">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido: se corre a la derecha cuando el sidebar está abierto (escritorio) */}
      <div className={`transition-[padding] duration-200 ${open ? "sm:pl-[240px]" : "sm:pl-0"}`}>
        <main className="mx-auto max-w-[860px] overflow-x-clip px-5 py-7 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
