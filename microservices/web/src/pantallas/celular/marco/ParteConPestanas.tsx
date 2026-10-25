import type { ReactNode } from "react";
import type { NombreDeIcono } from "../../../ui";
import { Pestanas } from "../Pestanas";

// Una parte del celular con sus pestañas (Catálogo, Depósito): el título, las pestañas que la
// persona puede usar y, debajo, la pantalla de la pestaña abierta.
type Opcion<T extends NombreDeIcono> = { valor: T; nombre: string };
type Props<T extends NombreDeIcono> = { titulo: string; opciones: Opcion<T>[]; actual: T; alElegir: (v: T) => void; children: ReactNode };

export function ParteConPestanas<T extends NombreDeIcono>({ titulo, opciones, actual, alElegir, children }: Props<T>) {
  return (
    <main className="contenido">
      <div className="encabezado">
        <h1 className="titulo">{titulo}</h1>
        <Pestanas opciones={opciones.map((s) => ({ valor: s.valor, nombre: s.nombre, icono: s.valor }))} actual={actual} alElegir={alElegir} />
      </div>
      {children}
    </main>
  );
}
