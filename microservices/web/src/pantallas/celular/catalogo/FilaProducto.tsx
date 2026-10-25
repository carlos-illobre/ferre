import { faltaParaElPrecio, precioDelProducto, type Producto } from "../../../negocio/catalogo";
import { esMargenBoton } from "../../../negocio/precios";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import { pesosCortos } from "../../../negocio/formato";
import { Icono } from "../componentes/base";

// Cada producto, una tarjeta blanca como la v2 (decisión 145): la foto; el stock en color arriba
// del nombre; la marca y el código del proveedor; el precio con su margen y, debajo, «Agregar» a
// la venta. «Agregar» va al lado del botón que abre la ficha, no adentro: un botón no puede tener
// otro adentro.
type Props = { producto: Producto; stock: { hay: boolean; texto: string }; elegida: boolean; alAbrir: () => void; alAgregar?: () => void };

export function FilaProducto({ producto: p, stock, elegida, alAbrir, alAgregar }: Props) {
  return (
    <div className={`tarjeta-producto ${alAgregar ? "con-agregar" : ""}`}>
      <button type="button" className={`fila con-foto ${elegida ? "elegida" : ""}`} onClick={alAbrir} data-testid="producto" aria-selected={elegida}>
        <span className="miniatura">{p.foto_url ? <img src={p.foto_url.startsWith("/") ? `${import.meta.env.VITE_API_URL}${p.foto_url}` : p.foto_url} alt="" /> : <Icono nombre="camara" tam={22} grosor={1.6} />}</span>
        <span className="nombre"><span className={`stock-texto ${stock.hay ? "hay" : "no"}`} data-testid="stock">{stock.hay ? `${stock.texto} ${TEXTOS.catalogo.enStock.corto}` : stock.texto}</span>{p.descripcion}</span>
        <PrecioDeLaFila p={p} />
        <span className="detalle">{[p.marca, p.codigo_proveedor].filter(Boolean).join(" · ")}</span>
      </button>
      {alAgregar && (
        <button type="button" className="agregar-a-la-venta" onClick={alAgregar} aria-label={`${TEXTOS.catalogo.agregarALaVenta.corto}: ${p.descripcion}`} data-testid="agregar">
          <Icono nombre="carrito" tam={18} grosor={1.9} />{TEXTOS.catalogo.agregar.corto}
        </button>
      )}
    </div>
  );
}

// El precio (o «Sin precio») y, debajo, el margen (a mano, si no es uno de los botones) o qué le falta.
function PrecioDeLaFila({ p }: { p: Producto }) {
  const fijaMargen = usePuede()("catalogo.margenes");
  const { costo, valor: precio } = precioDelProducto(p);
  const t = TEXTOS.ficha;
  const margen = p.margen_elegido === null ? t[faltaParaElPrecio(costo, fijaMargen)].corto
    : `${p.margen_elegido} %${esMargenBoton(p.margen_elegido) ? "" : ` ${t.aMano.corto}`}${costo === null ? ` · ${t.sinCosto.corto}` : ""}`;
  return (
    <span className="derecha">
      {precio === null ? <strong className="sin-precio">{TEXTOS.catalogo.sinPrecioTitulo.corto}</strong> : <strong className="importe">{pesosCortos(precio)}</strong>}
      <small className={p.margen_elegido === null ? "falta" : ""}>{margen}</small>
    </span>
  );
}
