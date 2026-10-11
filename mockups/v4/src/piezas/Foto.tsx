import type { ReactNode } from "react";
import type { DibujoDeFoto, Producto } from "../datos";
import { Icono } from "./Icono";

// En la maqueta no hay fotos de verdad: cada producto tiene un dibujo sobrio, sobre un fondo de
// color suave, que se lee como «acá va la foto». En la app real esto es un <img>.
const DIBUJOS: Record<DibujoDeFoto, ReactNode> = {
  mecha: <>
    <path d="M12 36 30 18" strokeWidth="5" />
    <path d="m30 18 5-5 3 1-1 3-4 4" strokeWidth="2.5" />
    <path d="m15 30 5 5M19 26l5 5M23 22l5 5" strokeWidth="2" opacity=".55" />
    <path d="m9 39 3-3" strokeWidth="5" opacity=".45" />
  </>,
  clavos: <>
    <path d="M13 12h8M17 12v24M17 36l-1.5-4h3z" strokeWidth="2.5" />
    <path d="M24 16h8M28 16v22M28 38l-1.5-4h3z" strokeWidth="2.5" opacity=".7" />
    <path d="M33 10h7M36.5 10v18" strokeWidth="2.5" opacity=".45" />
  </>,
  taladro: <>
    <path d="M9 14h20a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H9z" fill="currentColor" fillOpacity=".18" strokeWidth="2.5" />
    <path d="M32 18h5v4h-5M37 20h5" strokeWidth="2.5" />
    <path d="M14 26v9h8v-9" strokeWidth="2.5" />
    <path d="M11 35h14v5H11z" fill="currentColor" fillOpacity=".35" strokeWidth="2.5" />
    <path d="M14 18h9" strokeWidth="2" opacity=".55" />
  </>,
  cinta: <>
    <circle cx="24" cy="24" r="14" fill="currentColor" fillOpacity=".2" strokeWidth="2.5" />
    <circle cx="24" cy="24" r="6" fill="var(--superficie)" fillOpacity=".7" strokeWidth="2.5" />
    <path d="M36 31l5 3" strokeWidth="2.5" opacity=".6" />
  </>,
  llave: <>
    <path d="M11 39 27 23" strokeWidth="5" />
    <path d="M26 24a8 8 0 0 1 9-13l-5 5 1 4 4 1 5-5a8 8 0 0 1-13 9z" fill="currentColor" fillOpacity=".2" strokeWidth="2.5" />
    <path d="M12 38h.01" strokeWidth="2" stroke="var(--superficie)" />
  </>,
  cable: <>
    <ellipse cx="22" cy="24" rx="13" ry="12" strokeWidth="2.5" />
    <ellipse cx="22" cy="24" rx="8.5" ry="7.5" strokeWidth="2.5" opacity=".65" />
    <ellipse cx="22" cy="24" rx="4" ry="3.5" strokeWidth="2.5" opacity=".4" />
    <path d="M33 30c4 2 7 5 8 9" strokeWidth="2.5" />
  </>,
  caja: <>
    <path d="m10 17 14-7 14 7v15l-14 7-14-7z" fill="currentColor" fillOpacity=".15" strokeWidth="2.5" />
    <path d="m10 17 14 7 14-7M24 24v15" strokeWidth="2.5" />
  </>,
};

type Props = {
  producto: Pick<Producto, "foto" | "tono" | "nombre">;
  /** `chica` (48 px, para los renglones), `mediana` (96 px, en la ficha) o `grande` (ampliada). */
  tam?: "chica" | "mediana" | "grande";
};

/** La foto de un producto: cuadrada, de esquinas redondeadas. Sin foto, un marcador vacío con una cámara tenue. */
export function FotoDeProducto({ producto, tam = "chica" }: Props) {
  if (!producto.foto) {
    return <span className={`foto foto--${tam} foto--sin`} role="img" aria-label="Sin foto"><Icono nombre="camara" tam={tam === "chica" ? 22 : tam === "mediana" ? 32 : 56} grosor={tam === "chica" ? 1.7 : 1.5} /></span>;
  }
  return (
    <span className={`foto foto--${tam} figura--${producto.tono}`} role="img" aria-label={`Foto de ${producto.nombre}`}>
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{DIBUJOS[producto.foto]}</svg>
    </span>
  );
}
