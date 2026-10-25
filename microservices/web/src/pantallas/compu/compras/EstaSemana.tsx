import { esDeLaSemana, gastoPorDia, letrasDeLaSemana, type CompraFila, type Gastos } from "../../../negocio/compras";
import { fecha, pesos, pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Explicado } from "../base/ui";
import { plural } from "../deposito/deposito-comun";
import css from "./Compras.module.css";

// Lo gastado en la semana, con su cuenta por proveedor y sus barras por día.
const t = TEXTOS.compras;

function deDondeSale(gastos: Gastos): string[] {
  const hasta = new Date(new Date(`${gastos.desde}T00:00:00`).getTime() + 6 * 86_400_000).toISOString().slice(0, 10);
  const periodo = `del ${fecha(gastos.desde).slice(0, 5)} al ${fecha(hasta).slice(0, 5)}`;
  const porProveedor = gastos.por_proveedor.length ? gastos.por_proveedor.map((p) => `${p.proveedor}, ${plural(Number(p.compras), "compra", "compras")}: ${pesos(p.total)}`) : ["En la semana no se registraron compras"];
  return [...porProveedor, `Gastos de la semana (${periodo}): ${pesos(gastos.total)}`];
}

function cuantasCompras(gastos: Gastos, compras: CompraFila[] | null): string {
  const cuantas = gastos.por_proveedor.reduce((s, p) => s + Number(p.compras), 0);
  const anuladas = (compras ?? []).filter((c) => c.estado === "anulada" && esDeLaSemana(c, gastos)).length;
  return `${plural(cuantas, "compra", "compras")}${anuladas ? ` · ${plural(anuladas, "anulada", "anuladas")}` : ""}`;
}

export function EstaSemana({ gastos, compras, error }: { gastos: Gastos | null; compras: CompraFila[] | null; error: string | null }) {
  const dias = gastoPorDia(gastos, compras);
  const mayor = Math.max(1, ...(dias ?? []).map((d) => d.total));
  return (
    <div className={`${css.resumen} ${css.semana}`} data-testid="indicador-gastos">
      <span><span className={css.et}>{t.estaSemana.largo}</span>
        <span className={css.va}>{gastos ? <Explicado valor={pesosCortos(gastos.total)} etiqueta="Gastos de la semana" titulo="De dónde salen los gastos de la semana" pasos={deDondeSale(gastos)} /> : "—"}</span>
        <span className={css.sub} data-testid="gastos-semana">{error ?? (gastos ? cuantasCompras(gastos, compras) : "Trayendo el dato…")}</span></span>
      <span className={css.barras} aria-hidden="true">
        {letrasDeLaSemana(gastos).map((letra, i) => (
          <span key={i} className={`${css.barra} ${i === 6 ? "hoy" : ""}`}><i style={{ height: dias ? Math.max(4, (dias[i]!.total / mayor) * 34) : 4 }} /><small>{letra}</small></span>
        ))}
      </span>
    </div>
  );
}
