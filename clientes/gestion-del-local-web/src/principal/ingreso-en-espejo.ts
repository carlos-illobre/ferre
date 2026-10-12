import type { Producto } from "./celular/pantallas/Productos";

// El ingreso de mercadería en curso, como viaja entre el celular y la computadora en espejo
// (decisión 60): el proveedor, el comprobante, su foto, la fecha y los renglones con cantidad y
// costo. De cada producto viaja solo el id; cada lado lo arma con su catálogo. El texto del
// costo mientras se tipea es de cada pantalla: viaja el número.
type Renglon = { clave: string; producto: Producto | null; descripcion: string; cantidad: number; costo: number | null; costoTexto: string; costoLista: number | null };
export type IngresoEnEspejo = {
  proveedorId: string; comprobante: string; foto: string | null; fecha: string;
  renglones: { clave: string; productoId: string | null; descripcion: string; cantidad: number; costo: number | null; costoLista: number | null }[];
};

export function ingresoParaElEspejo(proveedorId: string, comprobante: string, foto: string | null, fecha: string, renglones: Renglon[]): IngresoEnEspejo {
  return { proveedorId, comprobante, foto, fecha, renglones: renglones.map((r) => ({ clave: r.clave, productoId: r.producto?.id ?? null, descripcion: r.descripcion, cantidad: r.cantidad, costo: r.costo, costoLista: r.costoLista })) };
}

// Los renglones que llegan del otro lado. Si el costo no cambió, se conserva lo que se estaba
// tipeando acá; si cambió, se escribe como lo escribe esta pantalla (`aTexto`).
export function renglonesDeIngresoDelEspejo<T extends Renglon>(ingreso: IngresoEnEspejo, catalogo: Producto[], previos: T[], aTexto: (costo: number) => string): T[] {
  const porId = new Map(catalogo.map((p) => [p.id, p]));
  return ingreso.renglones.map((r) => {
    const previo = previos.find((p) => p.clave === r.clave);
    // Un producto que este catálogo no tiene (todavía) conserva su identidad, para no hacérsela perder al otro lado.
    const producto = r.productoId ? previo?.producto ?? porId.get(r.productoId) ?? ({ id: r.productoId, descripcion: r.descripcion, marca: null, codigo_barras: null, unidad: "unidad", margen_elegido: null, proveedor: null, codigo_proveedor: null, costo_neto: null, iva: null, fecha_lista: null, explicacion_costo: [] } as Producto) : null;
    return { clave: r.clave, producto, descripcion: r.descripcion, cantidad: r.cantidad, costo: r.costo, costoLista: r.costoLista, costoTexto: previo && previo.costo === r.costo ? previo.costoTexto : r.costo === null ? "" : aTexto(r.costo) } as T;
  });
}
