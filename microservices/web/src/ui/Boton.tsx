import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useEtiqueta } from "../plataforma/comandos";
import { Icono, type NombreDeIcono } from "./iconos";

// El botón de «Mostrador»: con su variante (principal, marino, peligro, sobre el marino), su
// tamaño, un ícono y, si hace una acción con nombre, la tecla que la pide (la pone el teclado).
type VarianteBoton = "principal" | "marino" | "peligro" | "sobre-marino";
const clasesDelBoton = (b: { variante?: VarianteBoton; tam?: string; ancho?: boolean; soloIcono: boolean; className?: string }) =>
  ["boton", b.variante, b.tam, b.ancho && "ancho", b.soloIcono && "solo-icono", b.className].filter(Boolean).join(" ");

export function Boton({ children, variante, tam, icono, ancho, accion, className, ...resto }: {
  children?: ReactNode; variante?: VarianteBoton; tam?: "chico" | "grande"; icono?: NombreDeIcono; ancho?: boolean; accion?: string; className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const tecla = useEtiqueta(accion ?? "");
  const clases = clasesDelBoton({ variante, tam, ancho, soloIcono: Boolean(icono) && (children === undefined || children === null), className });
  return (
    <button type="button" className={clases} aria-keyshortcuts={tecla} {...resto}>
      {icono && <Icono nombre={icono} tam={tam === "chico" ? 16 : 20} />}
      {children}
      {tecla && <span className="tecla solo-compu" aria-hidden="true">{tecla}</span>}
    </button>
  );
}
