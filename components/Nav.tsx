import Link from "next/link";
import { Wordmark } from "./Wordmark";
import { navLinks } from "@/lib/site";

export function Nav() {
  return (
    <header className="mx-auto flex max-w-[1120px] items-center justify-between px-6 py-6 sm:px-10 sm:py-7">
      <Link href="#inicio" aria-label="Psico.Gestión — inicio" className="hover:opacity-100">
        <Wordmark />
      </Link>

      <nav className="hidden items-center gap-[34px] text-[15px] text-body md:flex">
        {navLinks.map((l) => (
          <a key={l.href} href={l.href} className="text-body">
            {l.label}
          </a>
        ))}
      </nav>

      <a
        href="#agendar"
        className="rounded-full bg-brand px-5 py-2.5 text-[14px] font-medium text-white hover:opacity-100 hover:bg-brand-dark transition-colors"
      >
        Agendar hora
      </a>
    </header>
  );
}
