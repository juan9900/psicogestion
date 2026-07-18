import { ImagePlaceholder } from "./ImagePlaceholder";

export function Hero() {
  return (
    <section
      id="inicio"
      className="mx-auto grid max-w-[1120px] items-center gap-12 px-6 pb-16 pt-10 sm:px-10 md:grid-cols-[1.15fr_.85fr] md:pt-[52px]"
    >
      <div>
        <h1 className="font-serif text-[40px] font-normal leading-[1.05] tracking-[-0.02em] sm:text-[58px]">
          Psicóloga en Maracaibo: un espacio para entenderte y volver a tu
          equilibrio
        </h1>
        <p className="mt-[22px] max-w-[46ch] text-[18px] leading-[1.6] text-body">
          Psicóloga clínica en Maracaibo. Terapia para adultos, adolescentes y
          niños, con consultas presenciales en Maracaibo y sesiones de
          psicología online donde estés.
        </p>
        <div className="mt-[30px] flex flex-wrap items-center gap-[14px]">
          <a
            href="#agendar"
            className="rounded-full bg-ink px-7 py-[15px] text-[15px] font-medium text-cream hover:opacity-100 hover:brightness-125 transition"
          >
            Agendar una hora
          </a>
          <a href="#sobre" className="text-[15px] font-medium text-brand">
            Conocer a Carmen →
          </a>
        </div>
      </div>

      <ImagePlaceholder
        label={"foto retrato\nCarmen"}
        variant="cool"
        className="w-full rounded-2xl"
        style={{ aspectRatio: "4 / 5" }}
      />
    </section>
  );
}
