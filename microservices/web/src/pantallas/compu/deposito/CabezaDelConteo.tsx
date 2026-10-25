import type { Conteo } from "../../../negocio/deposito";
import { avanceDelConteo } from "../../../negocio/deposito";
import { fecha } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { plural } from "./deposito-comun";
import css from "./Contar.module.css";

// El sector, desde cuándo está abierto y cuánto se contó (con cuántos tienen diferencia).
export function CabezaDelConteo({ conteo, conDiferencia }: { conteo: Conteo; conDiferencia: number }) {
  const total = conteo.renglones.length + conteo.sin_contar.length;
  return (
    <div className={css.cab}>
      <div><h2>{conteo.sector}</h2><p className="detalle">{conteo.abierto_en ? `Abierto el ${fecha(conteo.abierto_en)} · ` : ""}lo seguís desde acá o desde el celular</p></div>
      <div className={css.avance} data-testid="avance">
        <span><span>{TEXTOS.contar.contados.largo}</span><b>{conteo.renglones.length} <small>de {total}</small></b></span>
        <span className={`${css.riel} oscuro`}><i style={{ width: `${total ? avanceDelConteo(conteo) * 100 : 0}%` }} /></span>
        {conDiferencia > 0 && <span className={css.conDif}>{plural(conDiferencia, "con diferencia", "con diferencia")}</span>}
      </div>
    </div>
  );
}
