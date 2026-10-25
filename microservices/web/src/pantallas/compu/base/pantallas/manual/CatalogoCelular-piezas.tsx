import type { ReactNode } from "react";
import MARCAS from "../manual-catalogo-celular-marcas.json";
import { Clip, Figura, type Dispositivo } from "./piezas";

// El capítulo «Catálogo: los productos» en el celular (012-T014, maqueta manual-catalogo-celular.html):
// Catálogo → Productos del teléfono, para el empleado de mostrador. En el teléfono casi todo se hace
// desde la ficha del producto, así que el orden no es el de la computadora. Las capturas y los clips
// los arma tests/capturas/tutorial/catalogo_celular.py; las capturas van al lado del paso, como en «Entrar».
export type Captura = keyof typeof MARCAS;
export const Captura = (p: { captura: Captura; alt: string; numero: string; pie: string }) =>
  <Figura carpeta="catalogo-celular" marcas={MARCAS[p.captura]} celular {...p} />;
export const Video = ({ nombre, etiqueta, children }: { nombre: string; etiqueta: string; children?: ReactNode }) => (
  <Clip carpeta="catalogo-celular" nombre={`clip-${nombre}`} testId={`manual-clip-celu-${nombre}`} etiqueta={`Clip: ${etiqueta}`} celular>
    <b>Mirá cómo se hace.</b>{children ? <> {children}</> : null}
  </Clip>
);

export const SECCIONES_DE_CATALOGO_CELULAR: { id: string; nombre: string; de: Dispositivo }[] = [
  { id: "cat-que", nombre: "¿Qué querés hacer?", de: "celu" },
  { id: "cat-pantalla", nombre: "La pantalla", de: "celu" },
  { id: "cat-buscar", nombre: "Buscar un producto", de: "celu" },
  { id: "cat-escanear", nombre: "Buscar escaneando", de: "celu" },
  { id: "cat-filtros", nombre: "Filtrar por stock o marca", de: "celu" },
  { id: "cat-agregar", nombre: "Agregar a la venta", de: "celu" },
  { id: "cat-ficha", nombre: "La ficha del producto", de: "celu" },
  { id: "cat-margen", nombre: "Poner el margen", de: "celu" },
  { id: "cat-precio", nombre: "De dónde sale el precio", de: "celu" },
  { id: "cat-proveedor", nombre: "Usar otro proveedor", de: "celu" },
  { id: "cat-codigo", nombre: "Cargar el código de barras", de: "celu" },
  { id: "cat-foto", nombre: "Sacarle una foto", de: "celu" },
  { id: "cat-lista", nombre: "Bajar la lista", de: "celu" },
  { id: "cat-problemas", nombre: "Si algo no funciona", de: "celu" },
];

export const TAREAS = [
  { id: "cat-buscar", nombre: "Buscar", detalle: "Un producto, por nombre, marca o código." },
  { id: "cat-escanear", nombre: "Buscar escaneando", detalle: "Con la cámara, apuntando al código de barras." },
  { id: "cat-filtros", nombre: "Filtrar", detalle: "Ver solo los que hay, los que faltan o una marca." },
  { id: "cat-agregar", nombre: "Agregar a la venta", detalle: "Sin ir a Vender." },
  { id: "cat-ficha", nombre: "Abrir la ficha", detalle: "Todo el producto en un solo lugar." },
  { id: "cat-margen", nombre: "Poner el margen", detalle: "Cuánto le ganás. El precio se calcula solo." },
  { id: "cat-precio", nombre: "Ver el precio", detalle: "De dónde sale cada número." },
  { id: "cat-proveedor", nombre: "Cambiar de proveedor", detalle: "Tomar el costo del que cobra menos." },
  { id: "cat-codigo", nombre: "Cargar el código", detalle: "Escaneándolo con la cámara." },
  { id: "cat-foto", nombre: "Sacarle una foto", detalle: "Con la cámara del celular." },
  { id: "cat-lista", nombre: "Bajar la lista", detalle: "El Excel que mandó el proveedor." },
];
