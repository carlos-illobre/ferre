import type { CompraFila, Pedido, useGastosDeLaSemana } from "../../../negocio/compras";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { mensajeDe, plural } from "../deposito/deposito-comun";
import { EstaSemana } from "./EstaSemana";
import css from "./Compras.module.css";

// Arriba: lo gastado en la semana, los pedidos por llegar, lo que se les debe y lo vencido (todavía no).
const t = TEXTOS.compras;
type Props = { veGastos: boolean; gastos: ReturnType<typeof useGastosDeLaSemana>; compras: CompraFila[] | null; porLlegar: Pedido[] | null };

export function ResumenesDeCompras({ veGastos, gastos, compras, porLlegar }: Props) {
  return (
    <div className={css.resumenes}>
      {veGastos && <EstaSemana gastos={gastos.datos} compras={compras} error={gastos.error ? mensajeDe(gastos.error, "Se ve cuando vuelva internet") : null} />}
      <div className={css.resumen} data-testid="pedidos-por-llegar">
        <span className={css.ico}><Icono nombre="truck" /></span>
        <span><span className={css.et}>{t.pedidosPorLlegar.largo}</span><span className={css.va}>{porLlegar ? porLlegar.length : "—"}</span>
          <span className={css.sub}>{porLlegar ? plural(porLlegar.filter((p) => p.estado === "recibido_parcial").length, "llegó a medias", "llegaron a medias") : "—"}</span></span>
      </div>
      <div className={css.resumen} data-testid="se-les-debe">
        <span className={css.ico}><Icono nombre="landmark" /></span>
        <span><span className={css.et}>{t.seLesDebe.largo}</span><span className={css.va}>—</span><span className={css.sub}>{t.todaviaNo.corto}</span></span>
      </div>
      <div className={`${css.resumen} error`} data-testid="vencido">
        <span className={css.ico}><Icono nombre="triangle-alert" /></span>
        <span><span className={css.et}>{t.vencido.largo}</span><span className={css.va}>—</span><span className={css.sub}>{t.todaviaNo.corto}</span></span>
      </div>
    </div>
  );
}
