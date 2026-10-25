import { gastoPorDia, letrasDeLaSemana, type CompraFila, type Gastos } from "../../../negocio/compras";
import { pesosCortos } from "../../../formato";
import { TEXTOS } from "../../textos";
import css from "./Compras.module.css";

// Arriba: lo gastado en la semana, con sus barras por día (tocarlo muestra lo comprado a cada
// proveedor), y lo que se les debe (todavía no).
const t = TEXTOS.compras;
type Props = { veGastos: boolean; gastos: Gastos | null; filas: CompraFila[] | null; alVerPorProveedor: () => void };

export function ResumenesDeCompras({ veGastos, gastos, filas, alVerPorProveedor }: Props) {
  const dias = gastoPorDia(gastos, filas);
  const mayor = Math.max(1, ...(dias ?? []).map((d) => d.total));
  return (
    <div className={css.resumenes}>
      {veGastos && (
        <button type="button" className={css.res} onClick={alVerPorProveedor} disabled={!gastos} data-testid="numero-gastos">
          <span className={css.et}>{t.estaSemana.corto}</span>
          <span className={css.va} data-testid="gastos-semana">{gastos ? pesosCortos(gastos.total) : "—"}</span>
          <span className={css.barras} aria-hidden="true">
            {letrasDeLaSemana(gastos).map((_, i) => <i key={i} className={i === 6 ? "hoy" : ""} style={{ height: dias ? Math.max(4, (dias[i]!.total / mayor) * 26) : 4 }} />)}
          </span>
        </button>
      )}
      <div className={`${css.res} error`} data-testid="se-les-debe">
        <span className={css.et}>{t.seLesDebe.corto}</span>
        <span className={css.va}>—</span>
        <span className={css.sub}>{t.todaviaNo.corto}</span>
      </div>
    </div>
  );
}
