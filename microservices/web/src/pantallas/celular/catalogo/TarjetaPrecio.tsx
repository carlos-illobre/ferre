import { useState } from "react";
import { faltaParaElPrecio, margenAMano, precioDelProducto, type Producto } from "../../../negocio/catalogo";
import { pesosCortos } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../componentes/base";
import { CalculoDeLaFicha } from "./CalculoDeLaFicha";
import type { Cambios } from "./useProductosDelCelular";
import css from "./Ficha.module.css";

// El precio de venta grande, sin bajar (la v2), con el margen y «Así se calcula» (RF-114), que
// despliega debajo los márgenes (300 a 25 y «Otro», el porcentaje a mano) y la cuenta.
const t = TEXTOS.ficha;
type Props = { producto: Producto; fijaMargen: boolean; veCostos: boolean; alCambiar: (c: Cambios) => void };

export function TarjetaPrecio({ producto: p, fijaMargen, veCostos, alCambiar }: Props) {
  const { costo, calculo } = precioDelProducto(p);
  const [abierto, setAbierto] = useState(false);
  const falta = t[faltaParaElPrecio(costo, fijaMargen)].corto;
  const desplegable = veCostos || fijaMargen;
  return (
    <>
      <section className={css.precio} aria-label={t.precioDeVenta.corto}>
        <div>
          <span className="ficha-detalle">{t.precioDeVenta.corto}</span>
          {calculo ? <strong className="ficha-precio" data-testid="precio-de-venta">{pesosCortos(calculo.valor)}</strong> : <span className="ficha-sin-precio" data-testid="sin-precio">{falta}</span>}
        </div>
        {desplegable ? (
          <button type="button" className={css.margen} onClick={() => setAbierto((a) => !a)} aria-expanded={abierto} data-testid="abrir-calculo">
            <ElMargen p={p} falta={falta} />
            <span>{veCostos ? t.asiSeCalcula.corto : t.margen.corto}<Icono nombre={abierto ? "arriba" : "abajo"} tam={16} /></span>
          </button>
        ) : <span className={css.margen}><ElMargen p={p} falta={falta} /></span>}
      </section>
      {/* Sin permiso de ver costos no hay cuenta (016-E21): solo los márgenes. */}
      {abierto && desplegable && <CalculoDeLaFicha producto={p} fijaMargen={fijaMargen} veCostos={veCostos} sinCosto={costo === null} alCambiar={alCambiar} />}
    </>
  );
}

function ElMargen({ p, falta }: { p: Producto; falta: string }) {
  const texto = p.margen_elegido === null ? falta : `${t.margen.corto.toLowerCase()} ${p.margen_elegido} %${margenAMano(p) !== null ? ` ${t.aMano.corto}` : ""}`;
  return <b className={p.margen_elegido === null ? "falta" : ""}>{texto}</b>;
}
