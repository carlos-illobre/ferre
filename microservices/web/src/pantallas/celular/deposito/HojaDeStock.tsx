import { abreviarUnidad, type Producto } from "../../../negocio/catalogo";
import { conSaldo, useMovimientos, type StockFila } from "../../../negocio/deposito";
import { usePuede } from "../../permisos";
import { pesosEnteros } from "../../comun/deposito/movimientos";
import { Hoja } from "../componentes/base";
import { CorregirEnLaHoja } from "./CorregirEnLaHoja";
import { MovimientosDeLaHoja } from "./MovimientosDeLaHoja";
import css from "./Stock.module.css";

// La hoja de un producto: su stock, los movimientos que lo explican y la corrección.
const num = (n: number) => n.toLocaleString("es-AR");
type Props = { producto: Producto; fila: StockFila | null; alCerrar: () => void; alAjustar: (mensaje: string) => void };

export function HojaDeStock({ producto: p, fila, alCerrar, alAjustar }: Props) {
  const puede = usePuede();
  const cantidad = Number(fila?.stock ?? 0);
  const { movimientos: traidos, error: sinMovimientos } = useMovimientos(p.id);
  const movimientos = traidos ?? (sinMovimientos ? [] : null);
  return (
    <Hoja titulo={p.descripcion} alCerrar={alCerrar} testId="detalle-stock" clase="st-hoja">
      <p className={css.hojaQuien}>{quienLoTrae(p, fila)}</p>
      <SaldoDeLaHoja producto={p} fila={fila} cantidad={cantidad} cuantos={movimientos?.length ?? null} veInvertido={puede("negocio.invertido")} />
      <MovimientosDeLaHoja movimientos={movimientos} conSaldo={conSaldo(movimientos, cantidad)} />
      {puede("deposito.stock") && <CorregirEnLaHoja producto={p} cantidad={cantidad} alAjustar={alAjustar} />}
    </Hoja>
  );
}

const cuantoVale = (fila: StockFila | null) => (fila?.costo_neto == null || Number(fila.valor) <= 0 ? "—" : pesosEnteros(Number(fila.valor)));

// El stock grande, que es la suma de sus movimientos; el mínimo (todavía no) y, con su permiso, cuánto vale.
function SaldoDeLaHoja({ producto: p, fila, cantidad, cuantos, veInvertido }: { producto: Producto; fila: StockFila | null; cantidad: number; cuantos: number | null; veInvertido: boolean }) {
  return (
    <div className={css.saldo}>
      <span className={`${css.total} ${cantidad < 0 ? "negativo" : ""}`}>{cantidad < 0 ? "−" : ""}{num(Math.abs(cantidad))}<small>{abreviarUnidad(p.unidad)}</small></span>
      <span className={css.cuenta}>{cuantos !== null ? <>Es la suma de sus <b>{cuantos} {cuantos === 1 ? "movimiento" : "movimientos"}</b></> : "Es la suma de sus movimientos"}<br />
        Mínimo <b>—</b>{veInvertido && <> · vale <b data-testid="valor-stock">{cuantoVale(fila)}</b></>}</span>
    </div>
  );
}

const quienLoTrae = (p: Producto, fila: StockFila | null) => [p.marca, fila?.proveedor ?? p.proveedor].filter(Boolean).join(" · ") || "Sin marca ni proveedor";
