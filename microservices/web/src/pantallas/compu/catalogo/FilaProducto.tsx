import { esMargenBoton } from "../../../negocio/precios";
import { pesosCortos } from "../../../negocio/formato";
import { precioDelProducto, urlDeFoto, type Producto } from "../../../negocio/catalogo";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";
import css from "./Productos.module.css";

// Cada producto de la lista, como la v2: la foto, el nombre, la marca y el stock con su unidad; el
// precio con el margen debajo (o «Sin precio» y qué falta); y el carrito al final. Tocarla la
// elige y la ficha de al lado pasa a ser la suya.
type Props = { producto: Producto; stock: { hay: boolean; texto: string }; elegido: boolean; alElegir: () => void; alAgregar?: () => void };

export function FilaProducto({ producto: p, stock, elegido, alElegir, alAgregar }: Props) {
  return (
    <li className={`${css.fila} ${elegido ? "elegida" : ""}`} aria-selected={elegido} onClick={alElegir} data-testid="producto">
      <FotoDeLaFila url={urlDeFoto(p.foto_url ?? null)} />
      <span className={css.texto}>
        <span className={css.nombre} data-testid="nombre">{p.descripcion}</span>
        <span className={css.detalle}>{p.marca && <>{p.marca} · </>}<span className={`${css.stock} ${stock.hay ? "hay" : "no"}`} data-testid="stock">{stock.texto}</span></span>
      </span>
      <PrecioDeLaFila producto={p} />
      {alAgregar ? <button type="button" className={css.agregar} title={`${TEXTOS.catalogo.agregarALaVenta.largo} (+)`} onClick={(e) => { e.stopPropagation(); alAgregar(); }} aria-label={`${TEXTOS.catalogo.agregarALaVenta.largo}: ${p.descripcion}`} data-testid="agregar"><Icono nombre="carrito" tam={18} grosor={1.9} /></button> : <span />}
    </li>
  );
}

// El precio con el margen (y si es a mano); sin precio, qué falta: el costo, o elegir el margen.
function PrecioDeLaFila({ producto: p }: { producto: Producto }) {
  const fijaMargen = usePuede()("catalogo.margenes");
  const { costo, valor: precio } = precioDelProducto(p);
  if (precio !== null) return <span className={css.precio}><b data-testid="precio">{pesosCortos(precio)}</b><small>{p.margen_elegido} %{esMargenBoton(p.margen_elegido!) ? "" : ` ${TEXTOS.ficha.aMano.largo}`}</small></span>;
  const falta = costo === null ? TEXTOS.ficha.sinCosto.largo : fijaMargen ? TEXTOS.ficha.eligeMargen.largo : TEXTOS.ficha.sinMargen.largo;
  return <span className={`${css.precio} sin`}><b>{TEXTOS.catalogo.sinPrecioTitulo.largo}</b><small data-testid="sin-precio">{falta}</small></span>;
}

const FotoDeLaFila = ({ url }: { url: string | null }) => <span className={css.foto}>{url ? <img src={url} alt="" loading="lazy" /> : <Icono nombre="productos" tam={20} grosor={1.6} />}</span>;
