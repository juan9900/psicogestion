import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Config de tests — replica el alias @/* -> raíz de tsconfig.json.
// Componentes (*.tsx) corren en jsdom; todo lo demás (rutas API, libs
// server-only) corre en 'node', más rápido y sin DOM innecesario.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    // Por defecto 'node' (más rápido); los archivos que necesitan DOM
    // (componentes) lo declaran por-archivo con el docblock
    // `// @vitest-environment jsdom` al inicio (environmentMatchGlobs se
    // eliminó en Vitest 4).
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
});
