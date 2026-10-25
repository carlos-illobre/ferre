import { FotoProducto } from "../base/ui";
import { useFotoDelProducto, type ProductoConFoto } from "../../comun/catalogo/useFotoDelProducto";

// La foto de un producto, donde sea que aparezca en una lista (ingreso, inventario): se toca
// para verla en grande o para sacarla.
export function FotoDeProducto({ producto, alCambiar }: { producto: ProductoConFoto; alCambiar: (foto_url: string) => void }) {
  const f = useFotoDelProducto(producto, alCambiar);
  return <FotoProducto id={producto.id} url={f.url} descripcion={producto.descripcion} alSubir={f.subir} />;
}
