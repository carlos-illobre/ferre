import MARCAS from "../manual-catalogo-marcas.json";
import type { ReactNode } from "react";
import { Clip, Figura, type Dispositivo } from "./piezas";

// El capítulo «Catálogo: los productos» en la computadora (012-T012, maqueta manual-catalogo.html):
// todo lo que se hace en la pantalla Productos, para el empleado de mostrador. Las capturas y los
// clips los arma tests/capturas/tutorial/catalogo.py. Las capturas de una parte de la pantalla están
// al doble de resolución; «agregar» y «escanear» son la pantalla entera.
export type Captura = keyof typeof MARCAS;
export const Captura = (p: { captura: Captura; alt: string; numero: string; pie: string; ancho?: number }) =>
  <Figura carpeta="catalogo" marcas={MARCAS[p.captura]} doble={p.captura !== "agregar" && p.captura !== "escanear"} {...p} />;
export const Video = ({ nombre, etiqueta, children }: { nombre: string; etiqueta: string; children?: ReactNode }) => (
  <Clip carpeta="catalogo" nombre={`clip-${nombre}`} testId={`manual-clip-cat-${nombre}`} etiqueta={`Clip: ${etiqueta}`}>
    <b>Mirá cómo se hace.</b>{children ? <> {children}</> : null}
  </Clip>
);

export const SECCIONES_DE_CATALOGO: { id: string; nombre: string; de: Dispositivo }[] = [
  { id: "cat-que", nombre: "¿Qué querés hacer?", de: "compu" },
  { id: "cat-pantalla", nombre: "La pantalla", de: "compu" },
  { id: "cat-buscar", nombre: "Buscar un producto", de: "compu" },
  { id: "cat-filtros", nombre: "Filtrar por stock o marca", de: "compu" },
  { id: "cat-precio", nombre: "De dónde sale el precio", de: "compu" },
  { id: "cat-margen", nombre: "Poner el margen", de: "compu" },
  { id: "cat-proveedor", nombre: "Usar otro proveedor", de: "compu" },
  { id: "cat-lista", nombre: "Bajar la lista", de: "compu" },
  { id: "cat-foto", nombre: "Sacarle una foto", de: "compu" },
  { id: "cat-agregar", nombre: "Agregar a la venta", de: "compu" },
  { id: "cat-ficha", nombre: "La ficha del producto", de: "compu" },
  { id: "cat-codigo", nombre: "Cargar el código de barras", de: "compu" },
  { id: "cat-escanear", nombre: "Buscar escaneando", de: "compu" },
  { id: "cat-teclado", nombre: "Con el teclado", de: "compu" },
  { id: "cat-problemas", nombre: "Si algo no funciona", de: "compu" },
];

export const TAREAS = [
  { id: "cat-buscar", nombre: "Buscar", detalle: "Un producto, por nombre, marca o código." },
  { id: "cat-filtros", nombre: "Filtrar", detalle: "Ver solo los que hay, los que faltan o una marca." },
  { id: "cat-precio", nombre: "Ver el precio", detalle: "De dónde sale cada número." },
  { id: "cat-margen", nombre: "Poner el margen", detalle: "Cuánto le ganás. El precio se calcula solo." },
  { id: "cat-proveedor", nombre: "Cambiar de proveedor", detalle: "Tomar el costo del que cobra menos." },
  { id: "cat-lista", nombre: "Bajar la lista", detalle: "El Excel que mandó el proveedor." },
  { id: "cat-foto", nombre: "Sacarle una foto", detalle: "Con el celular o desde un archivo." },
  { id: "cat-agregar", nombre: "Agregar a la venta", detalle: "Sin ir a Vender." },
  { id: "cat-ficha", nombre: "Abrir la ficha", detalle: "Todo el producto en un solo lugar." },
  { id: "cat-codigo", nombre: "Cargar el código", detalle: "Para encontrarlo escaneándolo." },
  { id: "cat-escanear", nombre: "Buscar escaneando", detalle: "Con el celular vinculado." },
  { id: "cat-teclado", nombre: "Usar el teclado", detalle: "Todo sin mouse." },
];
