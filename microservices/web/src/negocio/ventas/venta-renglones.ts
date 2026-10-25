import { subirFoto } from "../../datos/conexion";
import { cantidadValida, useCatalogo, type Unidad } from "../catalogo";
import { ponerItems, type Item } from "./venta-en-curso";

// Cambiar los renglones de la venta: la cantidad o la descripción, la unidad (queda en el
// producto), el margen (queda en el producto si quien vende puede fijarlo), la foto y quitar.
export function useRenglones(fijaMargen: boolean, alCambiar?: (motivo: "quitar") => void) {
  const { actualizarProducto } = useCatalogo();
  const cambiarItem = (clave: string, cambios: Partial<Item>) => ponerItems((lista) => lista.map((it) => (it.clave === clave ? { ...it, ...cambios } : it)));
  function cambiarUnidad(item: Item, unidad: Unidad) {
    cambiarItem(item.clave, { unidad, cantidad: cantidadValida(String(item.cantidad), unidad) || 1 });
    if (item.producto) actualizarProducto(item.producto.id, { unidad }).catch(() => undefined);
  }
  function quitar(clave: string) {
    ponerItems((lista) => lista.filter((it) => it.clave !== clave));
    alCambiar?.("quitar");
  }
  function elegirMargen(item: Item, margen: number) {
    if (!item.producto) return;
    if (fijaMargen) actualizarProducto(item.producto.id, { margen_elegido: margen }).catch(() => undefined);
    cambiarItem(item.clave, { precioManual: null, producto: { ...item.producto, margen_elegido: margen } });
  }
  async function subirFotoDe(item: Item, archivo: File) {
    if (!item.producto) return;
    const foto_url = await subirFoto(item.producto.id, archivo);
    actualizarProducto(item.producto.id, { foto_url }).catch(() => undefined);
    cambiarItem(item.clave, { producto: { ...item.producto, foto_url } });
  }
  return { cambiarItem, cambiarUnidad, quitar, elegirMargen, subirFotoDe };
}
