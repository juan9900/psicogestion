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

// Canales de adquisición ("¿cómo supiste de mí?"). El `valor` se guarda en la
// columna citas.canal; el `label` es lo que ve la paciente en el formulario y
// el panel de análisis. Añadir un canal aquí lo habilita en ambos sitios.
export const CANALES = [
  { valor: "instagram", label: "Instagram" },
  { valor: "facebook", label: "Facebook" },
  { valor: "google", label: "Búsqueda en Google" },
  { valor: "recomendacion", label: "Me la recomendaron" },
  { valor: "tiktok", label: "TikTok" },
  { valor: "otro", label: "Otro" },
] as const;
