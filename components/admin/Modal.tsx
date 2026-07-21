"use client";

import { useEffect } from "react";

export function Modal({
  titulo,
  onClose,
  children,
  maxAlto,
}: {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Alto máximo del contenido, con scroll vertical propio (ej. lista de agendas del día). */
  maxAlto?: boolean;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-ink/30" aria-hidden />
      <div className="relative grid max-h-[85vh] w-full max-w-[420px] grid-rows-[auto_1fr] rounded-[16px] border border-line bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-serif text-[18px] text-ink">{titulo}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-7 w-7 place-items-center rounded-full text-muted transition hover:bg-cream"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className={`p-5 ${maxAlto ? "overflow-y-auto" : ""}`}>{children}</div>
      </div>
    </div>
  );
}
