import { urlDeFoto } from "../../../negocio/catalogo";
import { Icono } from "../base/ui";

// La foto chica de un producto en una lista; sin foto, el ícono de productos.
export function MiniaturaDeProducto({ url, tam = 18 }: { url: string | null | undefined; tam?: number }) {
  return (
    <span className="miniatura">
      {url ? <img src={urlDeFoto(url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={tam} grosor={1.6} />}
    </span>
  );
}
