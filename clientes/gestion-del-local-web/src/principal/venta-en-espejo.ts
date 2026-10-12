import type { Producto } from "./celular/pantallas/Productos";

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
