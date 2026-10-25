import type { Cargada } from "../../../negocio/catalogo";
import { porcentaje } from "../../../formato";
import { numero } from "../base/ui";
import css from "./Listas.module.css";

// El resumen de la lista: leídos, los que cambian (con cuánto en promedio), nuevos, sin cambio,
// los que ya no están y las filas salteadas.
export function NumerosDeLaLista({ r }: { r: Cargada["resumen"] }) {
  return (
    <div className={css.numeros} data-testid="resumen">
      <div><span>Leídos</span><b>{numero(r.leidas)}</b></div>
      <div className="cambian"><span>Cambian</span><b>{numero(r.modificados)}{r.modificados > 0 && <small>{porcentaje(r.variacion_promedio)}</small>}</b></div>
      <div><span>Nuevos</span><b>{numero(r.nuevos)}</b></div>
      <div><span>Sin cambio</span><b>{numero(r.sin_cambio)}</b></div>
      <div><span>Ya no están</span><b>{numero(r.dados_de_baja)}</b></div>
      <div className={r.salteadas > 0 ? "saltea" : ""}><span>Salteadas</span><b>{numero(r.salteadas)}</b></div>
    </div>
  );
}
