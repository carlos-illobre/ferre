import { urlDeFoto, type Producto } from "../../../negocio/catalogo";
import { Icono } from "../base/ui";

// La foto chica de un producto en una lista; sin foto, el ícono de productos.
export function MiniaturaDeProducto({ producto, tam }: { producto: Producto; tam: number }) {
  return (
    <span className="miniatura">
      {producto.foto_url ? <img src={urlDeFoto(producto.foto_url) ?? ""} alt="" loading="lazy" /> : <Icono nombre="productos" tam={tam} grosor={1.6} />}
    </span>
  );
}
