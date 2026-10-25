import { quienTieneElCodigo, type Producto } from "../../../negocio/catalogo";
import { FichaProducto } from "./FichaProducto";
import type { ProductosDelCelular } from "./useProductosDelCelular";

// La ficha del producto abierto; lo que se cambia en ella se guarda en el catálogo.
export function LaFicha({ x, producto }: { x: ProductosDelCelular; producto: Producto }) {
  return <FichaProducto producto={producto} quienLoTiene={(codigo) => quienTieneElCodigo(codigo, producto.id)} alCerrar={() => x.setAbiertoId(null)} alCambiar={(c) => x.actualizar(producto.id, c)} />;
}
