"use client";

import { useState } from "react";

const specs = [
  {
    t: "Terapia individual — adultos",
    d: "Un espacio para trabajar procesos personales, autoconocimiento, autoestima y bienestar emocional, a tu propio ritmo y con objetivos claros.",
  },
  {
    t: "Adolescentes",
    d: "Acompañamiento durante la etapa de cambios: identidad, relaciones, emociones y los desafíos propios de esta edad.",
  },
  {
    t: "Terapia infantil",
    d: "Un espacio de juego y contención para los más pequeños, con participación de la familia cuando es necesario.",
  },
  {
    t: "Ansiedad y depresión",
    d: "Herramientas concretas para reconocer, entender y manejar lo que sientes, recuperando bienestar en tu día a día.",
  },
];

export function Specialties() {
  const [open, setOpen] = useState(0);

  return (
    <section className="mx-auto max-w-[1120px] px-6 py-[72px] sm:px-10">
      <div className="grid items-start gap-12 md:grid-cols-[.9fr_1.1fr] md:gap-14">
        <div className="md:sticky md:top-10">
          <h2 className="mb-4 font-serif text-[38px] font-normal leading-[1.1]">
            En qué te puedo acompañar
          </h2>
          <p className="text-[16px] leading-[1.6] text-body">
            Cada proceso es distinto. Toca cada área para conocer cómo
            trabajamos juntos.
          </p>
        </div>

        <div className="border-t border-line-2">
          {specs.map((s, i) => {
            const isOpen = open === i;
            return (
              <div key={s.t} className="border-b border-line-2">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center gap-5 border-none bg-transparent px-1 py-6 text-left"
                >
                  <span className="flex-1 font-serif text-[24px] text-ink">
                    {s.t}
                  </span>
                  <span
                    className="font-serif text-[24px] leading-none text-brand transition-transform duration-200"
                    style={{ transform: isOpen ? "rotate(45deg)" : "none" }}
                  >
                    +
                  </span>
                </button>
                <div
                  className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
                  style={{ maxHeight: isOpen ? 220 : 0 }}
                >
                  <p className="mb-[22px] max-w-[52ch] text-[16px] leading-[1.7] text-body">
                    {s.d}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
