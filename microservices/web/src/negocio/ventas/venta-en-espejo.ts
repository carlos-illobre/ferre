import { useMemo } from "react";
import { productoEnMemoria, traerPorIds, useCatalogo } from "../catalogo";
import { useEspejar, useEspejo } from "../espejo";
import { marcarLoQueEntro } from "./llegados-del-celular";
import type { MedioDePago } from "@servidor/ventas";
import { cambiarVenta, useVentaEnCurso, ventaActual } from "./venta-en-curso";
import type { Producto } from "../catalogo";

// La venta en curso, como viaja entre el celular y la computadora en espejo (decisión 60): los
// renglones con su cantidad, unidad, precio a mano y margen, el medio de pago y el cliente. De
// cada producto viaja solo el id: cada lado lo arma con su propio catálogo. Lo que es de la
// pantalla (qué renglón está desplegado, lo escrito en la búsqueda) no viaja.
type Renglon = { clave: string; producto: Producto | null; descripcion: string; cantidad: number; unidad: string; precioManual: number | null; abierto: boolean };
export type VentaEnEspejo = {
  items: { clave: string; productoId: string | null; descripcion: string; cantidad: number; unidad: string; precioManual: number | null; margen: number | null }[];
  medio: string | null; clienteId: string;
};

export function ventaParaElEspejo(items: Renglon[], medio: string | null, clienteId: string): VentaEnEspejo {
  return {
    items: items.map((it) => ({ clave: it.clave, productoId: it.producto?.id ?? null, descripcion: it.descripcion, cantidad: it.cantidad, unidad: it.unidad, precioManual: it.precioManual, margen: it.producto?.margen_elegido ?? null })),
    medio, clienteId,
  };
}

// Los renglones que llegan del otro lado, armados con el catálogo de este. Un renglón que ya
// estaba conserva si estaba desplegado; el margen elegido en la venta viaja con el renglón.
export function renglonesDelEspejo<T extends Renglon>(venta: VentaEnEspejo, catalogo: Producto[], previos: T[]): T[] {
  const porId = new Map(catalogo.map((p) => [p.id, p]));
  return venta.items.map((it) => {
    // Un producto que este catálogo no tiene (todavía) no pierde su identidad: si se volviera
    // un «ítem libre», al avisar de vuelta se la haría perder también al otro lado.
    const base = it.productoId ? porId.get(it.productoId) ?? ({ id: it.productoId, descripcion: it.descripcion, marca: null, codigo_barras: null, unidad: it.unidad, margen_elegido: it.margen, proveedor: null, codigo_proveedor: null, costo_neto: null, iva: null, fecha_lista: null, explicacion_costo: [] } as Producto) : null;
    const producto = base && base.margen_elegido !== it.margen ? { ...base, margen_elegido: it.margen } : base;
    return { clave: it.clave, producto, descripcion: it.descripcion, cantidad: it.cantidad, unidad: it.unidad, precioManual: it.precioManual, abierto: previos.find((p) => p.clave === it.clave)?.abierto ?? false } as T;
  });
}

// Los renglones con el producto que recién llegó del servidor, conservando el margen de la venta.
function completarConLoTraido<T extends Renglon>(items: T[]): T[] {
  return items.map((it) => {
    const traido = it.producto && productoEnMemoria(it.producto.id);
    return traido && it.producto!.costo_neto === null ? { ...it, producto: { ...traido, margen_elegido: it.producto!.margen_elegido } } : it;
  });
}

// En espejo con el otro dispositivo (decisión 60): la venta es una sola, la arme quien la arme y
// desde la pantalla que sea. Se engancha una vez, desde la aplicación, no desde Vender (ADR-022).
export function useVentaEnEspejo(): void {
  const { catalogo } = useCatalogo();
  const { items, medio, clienteId } = useVentaEnCurso();
  const { lado } = useEspejo();
  useEspejar<VentaEnEspejo>("venta", useMemo(() => ventaParaElEspejo(items, medio, clienteId), [items, medio, clienteId]), (v) => {
    const antes = ventaActual().items;
    const despues = renglonesDelEspejo(v, catalogo ?? [], antes);
    // En la computadora, lo que agregó el celular se marca «Llegó del celular» un momento.
    if (lado === "computadora") marcarLoQueEntro(antes, despues);
    cambiarVenta({ items: despues, medio: v.medio as MedioDePago | null, clienteId: v.clienteId });
    // Los productos que este lado todavía no trajo se piden al servidor y se completan (specs/018).
    const faltan = despues.filter((it) => it.producto && !productoEnMemoria(it.producto.id)).map((it) => it.producto!.id);
    if (faltan.length) void traerPorIds(faltan).then(() => cambiarVenta({ items: completarConLoTraido(ventaActual().items) }));
  }, true);
}
