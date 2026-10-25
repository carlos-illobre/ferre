import { useMemo } from "react";
import { barrasDeLaSemana, type Sugerencia } from "../../../negocio/catalogo";
import { TEXTOS } from "../../textos";
import { Icono, numero } from "../base/ui";
import css from "./Duplicados.module.css";

// Los números de arriba: por revisar (con las barritas de los últimos siete días), cuántas por
// código, cuántas por descripción y cuántos se unieron hasta hoy.
export function NumerosDeDuplicados({ todas, unidos }: { todas: Sugerencia[]; unidos: number }) {
  const t = TEXTOS.duplicados;
  const barras = useMemo(() => barrasDeLaSemana(todas), [todas]);
  const tope = Math.max(1, ...barras);
  const porCodigo = todas.filter((s) => s.motivo === "codigo_barras").length;
  return (
    <div className={css.numeros}>
      <div className={`${css.numero} ambar`}>
        <span className={css.numeroIc}><Icono nombre="capas" /></span>
        <span className={css.numeroTexto}><span>{t.porRevisar.largo}</span><b>{numero(todas.length)} <small>{todas.length === 1 ? "sugerencia" : "sugerencias"}</small></b></span>
        <span className={css.barras} aria-label="Cuántas llegaron cada uno de los últimos siete días">{barras.map((n, i) => <i key={i} className={n ? "" : "vacia"} style={{ height: `${n ? Math.max(25, (n / tope) * 100) : 18}%` }} />)}</span>
      </div>
      <div className={css.numero}><span className={css.numeroIc}><Icono nombre="codigo-de-barras" /></span><span className={css.numeroTexto}><span>Mismo código</span><b>{numero(porCodigo)}</b></span></div>
      <div className={css.numero}><span className={css.numeroIc}><Icono nombre="texto" /></span><span className={css.numeroTexto}><span>{t.descripcionParecida.largo}</span><b>{numero(todas.length - porCodigo)}</b></span></div>
      <div className={`${css.numero} verde`}><span className={css.numeroIc}><Icono nombre="unir" /></span><span className={css.numeroTexto}><span>Unidos hasta hoy</span><b>{numero(unidos)} <small>{unidos === 1 ? "producto" : "productos"}</small></b></span></div>
    </div>
  );
}
