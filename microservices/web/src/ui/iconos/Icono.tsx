import { createElement } from "react";
import { LUCIDE, MARCAS, type Trazo } from "./trazos";
import { ALIAS } from "./alias";

// El único ícono de la aplicación, en el celular y en la computadora: trazo de 2 px, esquinas
// redondeadas y el color del texto (ADR-028). Se nombra como en Lucide o con su nombre en castellano.
export type NombreDeIcono = keyof typeof LUCIDE | keyof typeof MARCAS | keyof typeof ALIAS;

const trazosDe = (nombre: NombreDeIcono): Trazo[] =>
  (LUCIDE as Record<string, Trazo[]>)[(ALIAS as Record<string, string>)[nombre] ?? nombre] ?? (MARCAS as Record<string, Trazo[]>)[nombre] ?? [];

export function Icono({ nombre, tam = 20, grosor = 2, className }: { nombre: NombreDeIcono; tam?: number; grosor?: number; className?: string }) {
  return (
    <svg className={className} width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {trazosDe(nombre).map(([etiqueta, atributos], i) => createElement(etiqueta, { key: i, ...atributos }))}
    </svg>
  );
}
