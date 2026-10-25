import { precioDelProducto, stockDe, useCatalogo, type Producto } from "../../../negocio/catalogo";
import { pesosCortos } from "../../../negocio/formato";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import { FotoDeLaFicha } from "./FotoDeLaFicha";
import { MargenEnSegmentos } from "./MargenEnSegmentos";
import type { Cambios } from "./tipos";
import css from "./FichaAlLado.module.css";

// Arriba de la ficha: la foto, el stock, el nombre, la marca y el código, el precio y los márgenes
// (o el margen, para quien no puede fijarlo).
const t = TEXTOS.ficha;
type Props = { producto: Producto; alCambiar: (c: Cambios) => void; alSubirFoto: (archivo: File) => Promise<void>; alError: (m: string) => void };

export function CabezaDeLaFicha({ producto: p, alCambiar, alSubirFoto, alError }: Props) {
  const { stock } = useCatalogo();
  const fijaMargen = usePuede()("catalogo.margenes");
  const hay = stockDe(p, stock);
  return (
    <div className={css.cabeza}>
      <FotoDeLaFicha producto={p} alSubir={alSubirFoto} alError={alError} />
      <div className={css.titulos}>
        <span className={`${css.stock} ${hay.hay ? "hay" : "no"}`} data-testid="stock">{hay.hay ? `${hay.texto} ${TEXTOS.catalogo.enStock.largo}` : hay.texto}</span>
        <h2 className={css.nombre}>{p.descripcion}</h2>
        <p className={css.detalle}>{[p.marca, p.codigo_proveedor ? `Cód. ${p.codigo_proveedor}` : null].filter(Boolean).join(" · ") || t.sinMarca.largo}</p>
        <div className={css.precioFila}>
          <PrecioDeVenta producto={p} fijaMargen={fijaMargen} />
          {fijaMargen ? <MargenEnSegmentos producto={p} alCambiar={alCambiar} />
            : <span className={css.detalle} data-testid="margen-fijo">{p.margen_elegido === null ? t.sinMargen.largo : `${p.margen_elegido} %`}</span>}
        </div>
      </div>
    </div>
  );
}

// El precio de venta; sin precio, qué falta: el costo, o elegir el margen.
function PrecioDeVenta({ producto: p, fijaMargen }: { producto: Producto; fijaMargen: boolean }) {
  const { costo, calculo } = precioDelProducto(p);
  const falta = costo === null ? t.sinCosto.largo : fijaMargen ? t.eligeMargen.largo : t.sinMargen.largo;
  return (
    <div className={css.precioCaja}>
      <span className={css.etiqueta}>{t.precioDeVenta.largo}</span>
      {calculo ? <strong className={css.precio} data-testid="precio-de-venta">{pesosCortos(calculo.valor)}</strong> : <span className={css.sinPrecio} data-testid="sin-precio">{falta}</span>}
    </div>
  );
}
