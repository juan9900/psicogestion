import type { CSSProperties } from "react";

// Placeholder rayado con etiqueta monoespaciada.
// Reemplazar por <Image> con la foto real (retrato de Carmen, consulta, etc.).
export function ImagePlaceholder({
  label,
  variant = "warm",
  align = "center",
  className = "",
  style,
}: {
  label: string;
  variant?: "cool" | "warm" | "green";
  align?: "center" | "end";
  className?: string;
  style?: CSSProperties;
}) {
  const stripe =
    variant === "warm"
      ? "ph-stripe-warm"
      : variant === "green"
        ? "ph-stripe-green"
        : "ph-stripe";
  const color = variant === "green" ? "#bfe0d5" : "#a99f8d";

  return (
    <div
      className={`flex font-mono text-[13px] leading-snug ${stripe} ${className}`}
      style={{
        alignItems: align === "end" ? "flex-end" : "center",
        justifyContent: align === "end" ? "flex-start" : "center",
        textAlign: align === "end" ? "left" : "center",
        color,
        padding: align === "end" ? 26 : 20,
        ...style,
      }}
    >
      <span style={{ whiteSpace: "pre-line" }}>{label}</span>
    </div>
  );
}
