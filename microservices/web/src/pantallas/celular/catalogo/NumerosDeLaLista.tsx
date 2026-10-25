import type { Cargada } from "../../../negocio/catalogo";
import { porcentaje } from "../../../formato";
import css from "./Listas.module.css";

// El resumen de la lista: leídos, los que cambian, nuevos, sin cambio, los que ya no están y las salteadas.
const miles = (n: number | string) => Number(n).toLocaleString("es-AR");

export function NumerosDeLaLista({ r }: { r: Cargada["resumen"] }) {
  return (
    <div className={css.numeros} data-testid="resumen">
      <div><b>{miles(r.leidas)}</b><span>leídos</span></div>
      <div className="verde"><b>{miles(r.modificados)}{r.modificados > 0 && <small>{porcentaje(r.variacion_promedio)}</small>}</b><span>cambian</span></div>
      <div><b>{miles(r.nuevos)}</b><span>nuevos</span></div>
      <div><b>{miles(r.sin_cambio)}</b><span>sin cambio</span></div>
      <div><b>{miles(r.dados_de_baja)}</b><span>no están</span></div>
      <div className={r.salteadas > 0 ? "ambar" : ""}><b>{miles(r.salteadas)}</b><span>salteadas</span></div>
    </div>
  );
}
