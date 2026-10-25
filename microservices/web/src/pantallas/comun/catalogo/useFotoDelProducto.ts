import { useEffect, useState } from "react";
import { subirFoto } from "../../../negocio/catalogo";

// La foto de un producto en una lista (ingreso, inventario), en las dos interfaces: la que tiene y
// subir una nueva, que `alCambiar` avisa para guardarla en el catálogo de este dispositivo.
export type ProductoConFoto = { id: string; descripcion: string; foto_url?: string | null };
export function useFotoDelProducto(producto: ProductoConFoto, alCambiar: (foto_url: string) => void) {
  const [url, setUrl] = useState<string | null>(producto.foto_url ?? null);
  useEffect(() => { setUrl(producto.foto_url ?? null); }, [producto.foto_url]);
  const subir = async (archivo: File) => { const nueva = await subirFoto(producto.id, archivo); setUrl(nueva); alCambiar(nueva); };
  return { url, subir };
}
