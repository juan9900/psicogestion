"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    href: "/admin",
    label: "Resumen",
    icon: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  },
  {
    href: "/admin/citas",
    label: "Citas",
    icon: "M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  },
  {
    href: "/admin/ordenes",
    label: "Órdenes",
    icon: "M6 2h9l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm8 1v5h5M8 13h8M8 17h8",
  },
  {
    href: "/admin/recursos",
    label: "Recursos",
    icon: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z",
  },
  {
    href: "/admin/pagos",
    label: "Pagos",
    icon: "M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 4h18M7 15h4",
  },
  {
    href: "/admin/analisis",
    label: "Análisis",
    icon: "M4 19V5M4 19h16M8 19v-6M12 19V9M16 19v-4",
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    icon: "M10.3 3.3a1 1 0 0 1 1-.8h1.4a1 1 0 0 1 1 .8l.3 1.6a7 7 0 0 1 1.6.9l1.5-.5a1 1 0 0 1 1.2.4l.7 1.2a1 1 0 0 1-.2 1.3l-1.2 1a7 7 0 0 1 0 1.8l1.2 1a1 1 0 0 1 .2 1.3l-.7 1.2a1 1 0 0 1-1.2.4l-1.5-.5a7 7 0 0 1-1.6.9l-.3 1.6a1 1 0 0 1-1 .8h-1.4a1 1 0 0 1-1-.8l-.3-1.6a7 7 0 0 1-1.6-.9l-1.5.5a1 1 0 0 1-1.2-.4l-.7-1.2a1 1 0 0 1 .2-1.3l1.2-1a7 7 0 0 1 0-1.8l-1.2-1a1 1 0 0 1-.2-1.3l.7-1.2a1 1 0 0 1 1.2-.4l1.5.5a7 7 0 0 1 1.6-.9zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  },
];

export function SidebarNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((it) => {
        const active =
          it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-none items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] transition ${
              active
                ? "bg-brand text-white"
                : "text-body hover:bg-cream hover:text-ink"
            }`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-none"
            >
              <path d={it.icon} />
            </svg>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
