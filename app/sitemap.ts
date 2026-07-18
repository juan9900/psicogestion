import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Landing de una sola página: todas las secciones viven en "/" como anclas,
// así que el sitemap solo declara la home. `lastModified` fijo (fecha del
// último cambio de contenido) para no ensuciar el sitemap en cada deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date("2026-07-18"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
