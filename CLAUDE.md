@AGENTS.md

## Flujo de trabajo para features

Estas reglas aplican a toda feature nueva o cambio de comportamiento (no a fixes triviales de una línea):

1. **Mejor práctica primero.** Antes de implementar, evaluar cuál es el enfoque correcto para el caso (no el más rápido de escribir). Si hay una alternativa claramente mejor a lo que se pediría literalmente, señalarla antes de construir. Ejemplo real: en vez de un `setInterval` haciendo polling cada 15s para refrescar el estado de una orden, se usó Supabase Realtime (broadcast desde la base de datos) — push en vez de poll.
2. **Tests por feature.** Cada feature agrega sus tests en Vitest, co-locados como `*.test.ts`/`*.test.tsx` junto al archivo que prueban. Mockear dependencias externas (Supabase, Resend, fetch de PayPal) — los tests no deben pegarle a servicios reales.
3. **`architecture.md` vivo.** Cada feature actualiza `architecture.md` en la raíz del proyecto con lo que cambió (nuevas tablas, rutas, flujos, decisiones de arquitectura). Es el documento de referencia del funcionamiento del sitio.
4. **Suite al final.** Al terminar una feature o tarea, correr `npm test` **una sola vez** (no en cada paso intermedio) y reportar el resultado.
