import type { Metadata } from "next";
import { Newsreader, Instrument_Sans } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const SITE_URL = "https://psicogestion.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Psicóloga en Maracaibo | Carmen Machado — Terapia presencial y online",
  description:
    "Carmen Machado, psicóloga clínica en Maracaibo. Terapia para adultos, adolescentes y niños: consultas presenciales en Maracaibo y sesiones de psicología online. Agenda tu hora.",
  keywords: [
    "psicóloga en Maracaibo",
    "psicólogo Maracaibo",
    "terapia Maracaibo",
    "psicología online",
    "terapia para adultos",
    "terapia adolescentes",
    "terapia infantil",
    "ansiedad",
    "depresión",
    "Carmen Machado",
  ],
  authors: [{ name: "Carmen Machado" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_VE",
    url: SITE_URL,
    siteName: "Psico.Gestión",
    title:
      "Psicóloga en Maracaibo | Carmen Machado — Terapia presencial y online",
    description:
      "Psicóloga clínica en Maracaibo. Terapia para adultos, adolescentes y niños, presencial y online. Agenda tu hora.",
  },
  robots: { index: true, follow: true },
};

// Datos estructurados schema.org — refuerza el SEO local.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Psychologist",
  name: "Carmen Machado — Psico.Gestión",
  description:
    "Psicóloga clínica en Maracaibo. Terapia para adultos, adolescentes y niños, presencial y online.",
  url: SITE_URL,
  telephone: "+58 414-6929457",
  email: "infopsicogestion@gmail.com",
  areaServed: "Maracaibo, Venezuela",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Maracaibo",
    addressCountry: "VE",
  },
  availableService: [
    { "@type": "MedicalTherapy", name: "Terapia individual para adultos" },
    { "@type": "MedicalTherapy", name: "Terapia para adolescentes" },
    { "@type": "MedicalTherapy", name: "Terapia infantil" },
    { "@type": "MedicalTherapy", name: "Tratamiento de ansiedad y depresión" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${newsreader.variable} ${instrumentSans.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
