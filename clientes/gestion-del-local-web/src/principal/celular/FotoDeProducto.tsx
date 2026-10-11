import { useEffect, useState } from "react";
import { subirFoto } from "../../api";
import { FotoProducto } from "../../componentes/Foto";

// La foto de un producto, donde sea que aparezca en una lista (ingreso, inventario): se toca
// para verla en grande o para sacarla. `alCambiar` avisa la foto nueva para guardarla en el
// catálogo de este dispositivo.
export function FotoDeProducto({ producto, alCambiar }: { producto: { id: string; descripcion: string; foto_url?: string | null }; alCambiar: (foto_url: string) => void }) {
  const [url, setUrl] = useState<string | null>(producto.foto_url ?? null);
  useEffect(() => { setUrl(producto.foto_url ?? null); }, [producto.foto_url]);
  return <FotoProducto id={producto.id} url={url} descripcion={producto.descripcion} alSubir={async (archivo) => { const nueva = await subirFoto(producto.id, archivo); setUrl(nueva); alCambiar(nueva); }} />;
}
