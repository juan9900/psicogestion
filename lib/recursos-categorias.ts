// Lista fija de categorías para los recursos descargables. Es la fuente
// única de verdad tanto para el filtro de la vitrina pública como para el
// selector del formulario de administración. Cambiarla no requiere migración.
export const RECURSOS_CATEGORIAS = [
  "Ansiedad y estrés",
  "Autoestima",
  "Duelo y pérdida",
  "Relaciones y pareja",
  "Emociones y regulación",
  "Infancia y crianza",
  "Mindfulness y bienestar",
  "Herramientas para terapeutas",
] as const;

export type RecursoCategoria = (typeof RECURSOS_CATEGORIAS)[number];
