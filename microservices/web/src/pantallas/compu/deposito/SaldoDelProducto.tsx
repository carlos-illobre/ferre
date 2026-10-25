import type { Movimiento, StockFila } from "../../../negocio/deposito";
import { usePuede } from "../../permisos";
import { pesosEnteros } from "../../comun/deposito/movimientos";
import { numero } from "../base/ui";
import { nombreUnidad, plural, type Producto } from "./deposito-comun";
import css from "./Inventario.module.css";

// El stock grande, que es la suma de sus movimientos; el mínimo (todavía no) y, con su permiso, cuánto vale.
type Props = { producto: Producto; fila: StockFila | null; cantidad: number; movimientos: Movimiento[] | null; porEnviar: boolean };

export function SaldoDelProducto({ producto: p, fila, cantidad, movimientos, porEnviar }: Props) {
  const veInvertido = usePuede()("negocio.invertido");
  return (
    <div className={css.saldo}>
      <div className={`${css.total} ${cantidad < 0 ? "negativo" : ""}`} data-testid="stock-del-producto">{cantidad < 0 ? "−" : ""}{numero(Math.abs(cantidad))}<small>{nombreUnidad(p.unidad)}</small></div>
      <div className={css.cuentaSaldo}>
        {movimientos ? <>Es la suma de sus <b>{plural(movimientos.length, "movimiento", "movimientos")}</b></> : "Es la suma de sus movimientos"}<br />
        Mínimo <b>—</b>{veInvertido && <> · vale <b data-testid="valor-stock">{cuantoVale(fila)}</b></>}
        {porEnviar && <><br /><span className={`${css.pastilla} urgente`}>Se manda al volver internet</span></>}
      </div>
    </div>
  );
}

// Cuánto vale su stock, si tiene costo.
const cuantoVale = (fila: StockFila | null) => (fila?.costo_neto == null || Number(fila.valor) <= 0 ? "—" : pesosEnteros(Number(fila.valor)));
