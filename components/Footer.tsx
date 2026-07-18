import { Wordmark } from "./Wordmark";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="bg-ink text-sand">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-5 px-6 py-10 sm:px-10">
        <Wordmark size={20} onDark />
        <div className="flex flex-wrap gap-x-[26px] gap-y-2 text-[15px] text-[#c9c0b2]">
          <span>{site.ubicacion}</span>
          <a
            href="https://instagram.com/psicogestion"
            className="text-[#c9c0b2] hover:text-[#c9c0b2]"
          >
            {site.instagram}
          </a>
          <a
            href={`tel:${site.telefono.replace(/[^+\d]/g, "")}`}
            className="text-[#c9c0b2] hover:text-[#c9c0b2]"
          >
            {site.telefono}
          </a>
          <a
            href={`mailto:${site.email}`}
            className="text-[#c9c0b2] hover:text-[#c9c0b2]"
          >
            {site.email}
          </a>
        </div>
      </div>
    </footer>
  );
}
