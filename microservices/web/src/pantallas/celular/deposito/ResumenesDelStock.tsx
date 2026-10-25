import type { CuentaDelStock, FiltroDeStock, Stock } from "../../../negocio/deposito";
import { TEXTOS } from "../../textos";
import { pesosEnteros } from "../../comun/deposito/movimientos";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import css from "./Stock.module.css";

// Tres números arriba (bajo el mínimo, sin stock y negativo; los dos últimos filtran) y, con su
// permiso, el dinero invertido.
const t = TEXTOS.stock;
const num = (n: number) => n.toLocaleString("es-AR");
type Props = { cuenta: CuentaDelStock; filtro: FiltroDeStock; alElegir: (f: FiltroDeStock) => void; datos: Stock | null };

export function ResumenesDelStock({ cuenta, filtro, alElegir, datos }: Props) {
  const resumen = (valor: FiltroDeStock | null, clase: string, icono: NombreDeIcono, rotulo: string, cifra: string, testId: string) => {
    const contenido = <><span className={css.et}><Icono nombre={icono} tam={16} />{rotulo}</span><span className={css.va}>{cifra}</span></>;
    return valor
      ? <button type="button" className={`${css.res} ${clase}`} aria-pressed={filtro === valor} onClick={() => alElegir(valor)} data-testid={testId}>{contenido}</button>
      : <div className={`${css.res} ${clase}`} data-testid={testId}>{contenido}</div>;
  };
  return (
    <>
      <div className={css.resumenes}>
        {resumen(null, "urgente", "trending-down", t.bajoElMinimo.corto, "—", "bajo-el-minimo")}
        {resumen("cero", "neutro", "package-minus", t.sinStock.corto, num(cuenta.enCero), "sin-stock")}
        {resumen("negativo", "error", "circle-alert", t.negativo.corto, num(cuenta.negativos), "stock-negativo")}
      </div>
      {datos && <div className={css.dinero} data-testid="dinero-invertido-stock"><span>{t.dineroInvertido.corto}</span><strong>{pesosEnteros(datos.valor_total)}</strong></div>}
    </>
  );
}
