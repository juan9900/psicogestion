// Wordmark tipográfico "Psico.Gestión" (Newsreader).
// El logo real (texto negro sobre círculo verde menta) puede sustituir esto
// cuando esté disponible el SVG/PNG.
export function Wordmark({
  size = 23,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  // Color base del texto: tinta en claro, arena en oscuro. Se fija explícito
  // porque el wordmark suele ir dentro de un <a> (que colorea en verde).
  const textColor = onDark ? "#efe7db" : "#2a2724";
  return (
    <span
      className="font-serif"
      style={{ fontSize: size, letterSpacing: "-0.01em", color: textColor }}
    >
      <span style={{ fontWeight: 600 }}>Psico</span>
      <span style={{ fontWeight: 400, color: onDark ? "#7fc0ac" : "#3f8f79" }}>
        .
      </span>
      <span style={{ fontWeight: 400 }}>Gestión</span>
    </span>
  );
}
