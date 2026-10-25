import { cuantosProductos, horaCorta, iniciales, vistaDelCambio, type CambioApartado, type DeUnaPersona } from "../../../negocio/apartados";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { ICONO_DEL_CAMBIO, Pesos } from "../../comun/anomalias/piezas";
import type { ParaRevisarDeLaCompu } from "./useParaRevisarDeLaCompu";
import css from "./Anomalias.module.css";

const t = TEXTOS.anomaliasV2;

// A la izquierda, por persona: quién, «Sin acceso», su dispositivo y un renglón por cambio.
export function BandejaParaRevisar({ x, elegido }: { x: ParaRevisarDeLaCompu; elegido: CambioApartado }) {
  return (
    <div className={css.lista} ref={x.lista} data-flechas-propias>
      {x.grupos.map((g) => <Grupo key={g.usuario_id} g={g} x={x} elegido={elegido} />)}
      <div className={`mv-aviso pino ${css.nadaCuenta}`}><Icono nombre="info" tam={16} /><div>{t.nadaCuenta.largo}</div></div>
    </div>
  );
}

function Grupo({ g, x, elegido }: { g: DeUnaPersona; x: ParaRevisarDeLaCompu; elegido: CambioApartado }) {
  return (
    <section className={css.grupo} aria-label={g.usuario}>
      <div className={css.persona}><span className="mv-avatar">{iniciales(g.usuario)}</span><b>{g.usuario}</b><span className="mv-pastilla error">{t.sinAcceso.largo}</span>{g.dispositivo && <span className="mv-detalle">{g.dispositivo}</span>}</div>
      {g.cambios.map((c) => <Renglon key={c.id} c={c} elegido={c.id === elegido.id} no={Boolean(x.errores[c.id] || c.error)} alElegir={() => x.elegir(c.id)} />)}
    </section>
  );
}

function Renglon({ c, elegido, no, alElegir }: { c: CambioApartado; elegido: boolean; no: boolean; alElegir: () => void }) {
  const v = vistaDelCambio(c);
  return (
    <button type="button" className={`${css.item} ${elegido ? "sel" : ""} ${no ? "no" : ""}`} data-elegido={elegido ? "si" : "no"} aria-pressed={elegido} onClick={alElegir} data-testid="apartado">
      <span className="ico"><Icono nombre={ICONO_DEL_CAMBIO[v.tipo]} /></span>
      <span className="tx"><span className="t">{v.nombre}{v.tipo === "venta" ? ` · ${cuantosProductos(v.productos.length)}` : ""}</span><span className="d">{v.detalle}</span></span>
      <span className={`m ${v.importe === null ? "hora" : ""}`}>{v.importe === null ? horaCorta(c.hecho_en) : <Pesos valor={v.importe} />}</span>
      <Icono nombre="derecha" tam={16} className="ch" />
    </button>
  );
}
