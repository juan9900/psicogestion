import { ImagePlaceholder } from "./ImagePlaceholder";

export function Resources() {
  return (
    <section
      id="recursos"
      className="mx-auto max-w-[1120px] px-6 pb-[72px] sm:px-10"
    >
      <div className="grid items-center gap-10 rounded-[18px] bg-brand p-8 text-[#f2f9f6] sm:p-11 md:grid-cols-2">
        <div>
          <h2 className="mb-3.5 font-serif text-[32px] font-normal">
            Plantillas y recursos de psicología para descargar
          </h2>
          <p className="mb-6 text-[16px] leading-[1.6] text-[#dceee7]">
            Registros emocionales, guías y ejercicios de psicología en PDF,
            creados por una psicóloga clínica, listos para descargar y trabajar
            entre sesiones.
          </p>
          {/* Destino futuro: página propia de plantillas (aún no construida). */}
          <a
            href="#recursos"
            className="inline-block rounded-full bg-cream px-[26px] py-3.5 text-[15px] font-medium text-ink hover:opacity-100 hover:brightness-95 transition"
          >
            Ver plantillas →
          </a>
        </div>
        <ImagePlaceholder
          label="imagen recursos"
          variant="green"
          className="w-full rounded-xl"
          style={{ aspectRatio: "16 / 10" }}
        />
      </div>
    </section>
  );
}
