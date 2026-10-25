import { cuentaDelPrecio, type Producto } from "../../../negocio/catalogo";
import { pesos, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";
import css from "./FichaAlLado.module.css";

const t = TEXTOS.ficha;

// «Así se calcula» (RF-114), abierto: el costo, más el margen, más el IVA, y lo que se cobra
// redondeado a $1.000. F1 (o tocar el título) lo pliega. Sin costo o sin margen, qué falta.
export function BloqueCalculo({ producto: p, abierto, alPlegar }: { producto: Producto; abierto: boolean; alPlegar: () => void }) {
  const c = cuentaDelPrecio(p);
  return (
    <section className={`${css.bloque} ${css.calculo}`} data-testid="asi-se-calcula">
      <h3><button type="button" className={css.plegar} onClick={alPlegar} aria-expanded={abierto} aria-keyshortcuts="F1" data-ficha-vertical="" data-testid="abrir-calculo">
        {t.asiSeCalcula.largo}<span className={css.der}><Icono nombre={abierto ? "arriba" : "abajo"} tam={16} /><kbd className="tecla">F1</kbd></span>
      </button></h3>
      {c.falta !== null ? <p className={css.detalle} data-testid="cuenta-del-precio">{c.falta === "costo" ? t.faltaCosto.largo : t.faltaMargen.largo}</p> : (
        <div className={css.cuenta} data-testid="cuenta-del-precio">
          {abierto && <>
            <span>{t.costoDeCompra.largo}</span><b>{pesos(c.costo)}</b>
            {p.explicacion_costo.length > 0 && <small className={css.cuentaDetalle}>{p.explicacion_costo.join(" · ")}</small>}
            <span>+ {c.margen} % {t.deMargen.largo}</span><b>{pesos(c.costo + c.margenPesos)}</b>
            <span>+ {t.iva.largo} {String(Number((c.iva * 100).toFixed(2))).replace(".", ",")} %</span><b>{pesos(c.conIva)}</b>
          </>}
          <div className="cobra"><span>{t.seCobraRedondeado.largo}</span><b data-testid="se-cobra">{pesosCortos(c.cobra)}</b></div>
        </div>
      )}
    </section>
  );
}
