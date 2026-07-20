import Link from "next/link";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { EstadoOrdenWatcher } from "@/components/tienda/EstadoOrdenWatcher";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

type ConsultaOrden = {
  estado: string;
  recurso_titulo: string;
  monto: number;
  moneda: string;
  creado: string;
};

const iconProps = {
  width: 26,
  height: 26,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function IconCheck() {
  return (
    <svg {...iconProps}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconReloj() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}

function IconAlerta() {
  return (
    <svg {...iconProps}>
      <path d="M12 9v4M12 16.5h.01" />
      <path d="M10.3 3.9 2.4 18a1.8 1.8 0 0 0 1.6 2.7h16a1.8 1.8 0 0 0 1.6-2.7L13.7 3.9a1.8 1.8 0 0 0-3.4 0Z" />
    </svg>
  );
}

function IconDescarga() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5" />
      <path d="M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

// Círculo de estado con color propio por caso — reutiliza la misma paleta que
// los badges de /admin/ordenes para que "pagada/entregada", "pendiente" y
// "rechazada" se lean igual en todo el sitio.
function IconoEstado({ tono, children }: { tono: "brand" | "ambar" | "rojo"; children: React.ReactNode }) {
  const estilos = {
    brand: "bg-brand-tint text-brand-dark",
    ambar: "bg-[#fdf3e2] text-[#a87b25]",
    rojo: "bg-[#fbeaea] text-[#a33]",
  }[tono];
  return (
    <div className={`flex h-14 w-14 items-center justify-center rounded-full ${estilos}`}>
      {children}
    </div>
  );
}

function CTASecundarios() {
  return (
    <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-6">
      <Link
        href="/recursos"
        className="rounded-full border border-line-2 px-5 py-2.5 text-[14px] font-medium text-body transition hover:bg-cream"
      >
        Ver más recursos
      </Link>
      <Link
        href="/#agendar"
        className="rounded-full border border-line-2 px-5 py-2.5 text-[14px] font-medium text-body transition hover:bg-cream"
      >
        Agenda una sesión conmigo
      </Link>
    </div>
  );
}

export default async function OrdenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .rpc("consultar_orden", { p_token: token })
    .maybeSingle<ConsultaOrden>();

  const disponible = data && ["pagada", "entregada"].includes(data.estado);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-[560px] flex-1 px-6 py-[72px] sm:px-10">
        {!data ? (
          <div className="rounded-[18px] border border-line bg-white p-8 text-center">
            <p className="mb-4 text-[15px] text-body">
              No encontramos esa orden. Si crees que es un error, escríbenos a{" "}
              <a href={`mailto:${site.email}`} className="text-brand underline">
                {site.email}
              </a>
              .
            </p>
            <Link href="/recursos" className="text-[14px] font-medium text-brand underline">
              Volver a recursos
            </Link>
          </div>
        ) : (
          <div className="animate-[fadeUp_0.5s_ease-out] rounded-[18px] border border-line bg-white p-8 shadow-card">
            <EstadoOrdenWatcher estado={data.estado} token={token} />

            {disponible && (
              <>
                <IconoEstado tono="brand">
                  <IconCheck />
                </IconoEstado>
                <h1 className="mt-5 mb-1 font-serif text-[26px] text-ink">¡Tu compra está lista!</h1>
                <p className="mb-6 text-[14px] text-muted">
                  {data.recurso_titulo} · ${data.monto} {data.moneda}
                </p>
                <a
                  href={`/api/descargar/${token}`}
                  className="inline-flex items-center gap-2 rounded-full bg-brand px-[26px] py-3.5 text-[15px] font-medium text-white transition hover:brightness-110"
                >
                  <IconDescarga />
                  Descargar ahora
                </a>
                <p className="mt-4 text-[13px] leading-[1.6] text-muted">
                  También te enviamos este enlace a tu correo — guárdalo, puedes volver a descargarlo hasta 5 veces.
                </p>
                <CTASecundarios />
              </>
            )}

            {data.estado === "pendiente" && (
              <>
                <IconoEstado tono="ambar">
                  <IconReloj />
                </IconoEstado>
                <h1 className="mt-5 mb-1 font-serif text-[26px] text-ink">Estamos validando tu pago</h1>
                <p className="mb-1 text-[14px] text-muted">
                  {data.recurso_titulo} · ${data.monto} {data.moneda}
                </p>
                <p className="mt-4 text-[14px] leading-[1.6] text-body">
                  Reviso tu comprobante y te aviso por correo apenas confirme el pago — normalmente toma
                  pocas horas. Esta página se actualiza sola, no hace falta que la recargues.
                </p>
                <p className="mt-3 text-[13px] text-muted">
                  ¿Alguna duda?{" "}
                  <a href={`tel:${site.telefono.replace(/[^+\d]/g, "")}`} className="text-brand underline">
                    Escríbeme al {site.telefono}
                  </a>
                  .
                </p>
                <CTASecundarios />
              </>
            )}

            {data.estado === "rechazada" && (
              <>
                <IconoEstado tono="rojo">
                  <IconAlerta />
                </IconoEstado>
                <h1 className="mt-5 mb-1 font-serif text-[26px] text-ink">No pudimos confirmar tu pago</h1>
                <p className="mb-4 text-[14px] text-muted">
                  {data.recurso_titulo} · ${data.monto} {data.moneda}
                </p>
                <p className="text-[14px] leading-[1.6] text-body">
                  Si crees que se trata de un error, escríbenos y lo revisamos juntas.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${site.email}`}
                    className="rounded-full bg-brand px-5 py-2.5 text-[14px] font-medium text-white transition hover:brightness-110"
                  >
                    Escribir por correo
                  </a>
                  <a
                    href={`tel:${site.telefono.replace(/[^+\d]/g, "")}`}
                    className="rounded-full border border-line-2 px-5 py-2.5 text-[14px] font-medium text-body transition hover:bg-cream"
                  >
                    Llamar
                  </a>
                </div>
              </>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
