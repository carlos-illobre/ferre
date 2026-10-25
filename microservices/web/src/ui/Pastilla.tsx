import type { ReactNode } from "react";

// Una etiqueta chica de color, con un punto adelante.
export function Pastilla({ tipo, children, sinPunto }: { tipo?: "ok" | "alerta" | "mal" | "azul"; children: ReactNode; sinPunto?: boolean }) {
  return <span className={`pastilla ${tipo ?? ""} ${sinPunto ? "sin-punto" : ""}`}>{children}</span>;
}
