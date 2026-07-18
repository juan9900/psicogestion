import { ImagePlaceholder } from "./ImagePlaceholder";

export function About() {
  return (
    <section id="sobre" className="bg-sand">
      <div className="mx-auto max-w-[1120px] px-6 py-[72px] sm:px-10 sm:py-[90px]">
        <div className="grid items-stretch gap-12 md:grid-cols-[.92fr_1.08fr] md:gap-16">
          <ImagePlaceholder
            label="foto retrato · Carmen"
            variant="warm"
            align="end"
            className="min-h-[360px] overflow-hidden rounded-[18px] md:min-h-[580px]"
          />

          <div className="flex flex-col justify-center py-6">
            <div className="mb-[18px] font-serif text-[17px] italic text-brand">
              Sobre mí
            </div>
            <h2 className="mb-7 font-serif text-[38px] font-normal leading-[1.08] tracking-[-0.01em] sm:text-[48px]">
              Hola, soy Carmen.
            </h2>
            <p className="mb-5 max-w-[46ch] text-[18px] leading-[1.75] text-body-strong">
              Sé que dar el primer paso no es fácil. Por eso mi consulta de
              psicología en Maracaibo es un lugar tranquilo y sin juicios, donde
              puedes llegar tal como estás.
            </p>
            <p className="mb-9 max-w-[46ch] text-[16px] leading-[1.75] text-body">
              Acompaño a adultos, adolescentes y niños en procesos de ansiedad,
              depresión y momentos de cambio, de forma presencial en Maracaibo o
              mediante terapia online, siempre a tu ritmo.
            </p>
            <div className="mb-1.5 font-serif text-[30px] italic text-ink">
              Carmen Machado
            </div>
            <div className="text-[14px] tracking-[0.02em] text-muted">
              Psicóloga Clínica en Maracaibo · Consultas presenciales y online
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
