import { useState } from "react";
import { cuentaDelPrecio, margenAMano, otroMargen, type Producto } from "../../../negocio/catalogo";
import { MARGENES } from "../../../negocio/precios";
import { pesos, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import type { Cambios } from "./useProductosDelCelular";
import css from "./Ficha.module.css";

// «Así se calcula», desplegado: los márgenes (quien puede fijarlo) y la cuenta (quien ve costos).
const t = TEXTOS.ficha;
type Props = { producto: Producto; fijaMargen: boolean; veCostos: boolean; sinCosto: boolean; alCambiar: (c: Cambios) => void };

export function CalculoDeLaFicha({ producto: p, fijaMargen, veCostos, sinCosto, alCambiar }: Props) {
  return (
    <section className={`tarjeta ficha-tarjeta ${css.calculo}`} data-testid={veCostos ? "asi-se-calcula" : "margenes"}>
      <h3 className="ficha-tarjeta-titulo">{veCostos ? t.asiSeCalcula.corto : t.margen.corto}{veCostos && fijaMargen && <span className="ficha-detalle">{t.margen.corto.toLowerCase()}</span>}</h3>
      {fijaMargen && <SegmentosDeMargen producto={p} sinCosto={sinCosto} alCambiar={alCambiar} />}
      {veCostos && <LaCuenta producto={p} />}
    </section>
  );
}

// 300 a 25 y «Otro», el porcentaje a mano: Enter o salir lo guarda, Esc lo deja como estaba.
function SegmentosDeMargen({ producto: p, sinCosto, alCambiar }: { producto: Producto; sinCosto: boolean; alCambiar: (c: Cambios) => void }) {
  const manual = margenAMano(p);
  const [escribiendo, setEscribiendo] = useState(false);
  const [otro, setOtro] = useState("");
  const guardarOtro = () => { const v = otroMargen(otro); if (v !== null && v !== p.margen_elegido) alCambiar({ margen_elegido: v }); setEscribiendo(false); };
  return (
    <div className={css.segmentos} role="group" aria-label="margen" data-testid="segmentos-de-margen">
      {MARGENES.map((m, i) => (
        <button key={m} type="button" aria-pressed={p.margen_elegido === m} aria-label={`${m} %`} className={p.margen_elegido === m ? "activo" : ""} title={`Shift+${i + 1}`} disabled={sinCosto} onClick={() => alCambiar({ margen_elegido: m })}>{m}</button>
      ))}
      {escribiendo ? (
        <label className={css.otroCaja}><input autoFocus inputMode="numeric" placeholder="ej. 120" aria-label={t.otroMargen.corto} value={otro} data-testid="otro-margen"
          onChange={(e) => setOtro(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
          onKeyDown={(e) => { if (e.key === "Enter") guardarOtro(); else if (e.key === "Escape") { e.stopPropagation(); setEscribiendo(false); } }}
          onBlur={guardarOtro} /><span aria-hidden="true">%</span></label>
      ) : (
        <button type="button" className={manual !== null ? "activo" : ""} aria-pressed={manual !== null} disabled={sinCosto} onClick={() => { setOtro(manual === null ? "" : String(manual)); setEscribiendo(true); }}
          aria-label={manual !== null ? `${t.otroMargen.corto}: ${manual} % ${t.aMano.corto}` : t.otroMargen.corto} data-testid="margen-otro">{manual !== null ? `${manual} %` : t.otro.corto}</button>
      )}
    </div>
  );
}

// La cuenta: costo, más el margen, más el IVA y lo que se cobra redondeado; o qué le falta.
function LaCuenta({ producto: p }: { producto: Producto }) {
  const c = cuentaDelPrecio(p);
  if (c.falta !== null) return <p className="ficha-calculo-falta" data-testid="cuenta">{c.falta === "costo" ? t.faltaCosto.corto : t.faltaMargen.corto}</p>;
  return (
    <div className="ficha-cuenta" data-testid="cuenta">
      <span>{t.costoDeCompra.corto}</span><b>{pesos(c.costo)}</b>
      {p.explicacion_costo.length > 0 && <small className="ficha-cuenta-detalle">{p.explicacion_costo.join(" · ")}</small>}
      <span>+ {c.margen} % {t.deMargen.corto}</span><b>{pesos(c.costo + c.margenPesos)}</b>
      <span>+ {t.iva.corto} {String(Number((c.iva * 100).toFixed(2))).replace(".", ",")} %</span><b>{pesos(c.conIva)}</b>
      <div className="cobra"><span>{t.seCobraRedondeado.corto}</span><b data-testid="se-cobra">{pesosCortos(c.cobra)}</b></div>
    </div>
  );
}
