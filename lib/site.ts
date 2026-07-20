// Datos del sitio — centralizados para reutilizar en nav, footer y SEO.
export const site = {
  name: "Psico.Gestión",
  url: "https://psicogestion.com",
  profesional: "Carmen Machado",
  rol: "Psicóloga Clínica · Consultas presenciales y online",
  ubicacion: "Maracaibo, Venezuela",
  instagram: "@psicogestion",
  telefono: "+58 414-6929457",
  email: "infopsicogestion@gmail.com",
} as const;

export const navLinks = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#sobre", label: "Sobre mí" },
  { href: "/recursos", label: "Recursos" },
  { href: "/#agendar", label: "Agendar" },
] as const;
