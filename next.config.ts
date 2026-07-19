import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en el home del usuario que hace que
  // Next.js infiera mal la raíz del workspace (rompe la resolución de
  // módulos internos de Turbopack, ej. el loader de Google Fonts).
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
