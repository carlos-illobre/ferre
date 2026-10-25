import { useState } from "react";
import type { Movimiento } from "../../../negocio/deposito";
import { fecha } from "../../../formato";
import { comoSeVe } from "../../comun/deposito/movimientos";
import { Icono } from "../../../ui/iconos";
import css from "./Stock.module.css";

// Los movimientos, con lo que queda después de cada uno: los últimos cuatro y, a un toque, todos.
const num = (n: number) => n.toLocaleString("es-AR");
type ConSaldo = { m: Movimiento; queda: number }[];

export function MovimientosDeLaHoja({ movimientos, conSaldo }: { movimientos: Movimiento[] | null; conSaldo: ConSaldo }) {
  const [todos, setTodos] = useState(false);
  return (
    <>
      <div className={css.movsCab}><b>Movimientos</b><span>queda</span></div>
      {movimientos === null ? <small>Cargando…</small> : movimientos.length === 0 ? <small>Sin movimientos: su stock es cero.</small> : (
        <ul className={css.movs} data-testid="movimientos">
          {(todos ? conSaldo : conSaldo.slice(0, 4)).map(({ m, queda }) => <Renglon key={m.id} m={m} queda={queda} />)}
          {conSaldo.length > 4 && <li><button type="button" className={css.masMovs} onClick={() => setTodos((x) => !x)}>{todos ? "Ver solo los últimos" : `Ver ${conSaldo.length - 4} más`}</button></li>}
        </ul>
      )}
    </>
  );
}

function Renglon({ m, queda }: { m: Movimiento; queda: number }) {
  const { nombre, icono, clase } = comoSeVe(m);
  const c = Number(m.cantidad);
  return (
    <li className={css.mov}>
      <span className={`${css.movIc} ${clase}`}><Icono nombre={icono} tam={16} /></span>
      <span className={css.movTexto}><b>{nombre} · {fecha(m.fecha.slice(0, 10))}</b>{m.nota && <span>{m.nota}</span>}</span>
      <span className={`${css.movQ} ${c > 0 ? "mas" : ""}`}>{c > 0 ? "+" : c < 0 ? "−" : ""}{num(Math.abs(c))}</span>
      <span className={css.movQueda}>{num(queda)}</span>
    </li>
  );
}
