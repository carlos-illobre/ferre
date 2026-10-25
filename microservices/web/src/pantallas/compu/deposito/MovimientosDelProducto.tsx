import { useState } from "react";
import type { Movimiento } from "../../../negocio/deposito";
import { fecha } from "../../../formato";
import { comoSeVe } from "../../comun/deposito/movimientos";
import { Aviso, Progreso, numero } from "../base/ui";
import { Icono } from "../../../ui/iconos";
import { conSigno } from "./deposito-comun";
import css from "./Inventario.module.css";

// Los movimientos del producto, del más nuevo, con lo que queda después de cada uno: los últimos
// tres y, a un toque, todos.
type ConSaldo = { m: Movimiento; queda: number }[];
type Props = { id: string; movimientos: Movimiento[] | null; conSaldo: ConSaldo; error: string | null };

export function MovimientosDelProducto({ id, movimientos, conSaldo, error }: Props) {
  return (
    <>
      <div className={css.movsCab}><h3 id={`${id}-mov`}>Movimientos</h3><span className="detalle">queda</span></div>
      <Aviso tipo="alerta">{error}</Aviso>
      {movimientos === null && !error && <Progreso texto="Buscando los movimientos…" />}
      {movimientos?.length === 0 && <SinMovimientos />}
      {Boolean(movimientos?.length) && <LosMovimientos id={id} conSaldo={conSaldo} />}
    </>
  );
}

function LosMovimientos({ id, conSaldo }: { id: string; conSaldo: ConSaldo }) {
  const [todos, setTodos] = useState(false);
  return (
    <ul className={`${css.movs} ${todos ? "todos" : ""}`} aria-labelledby={`${id}-mov`} data-testid="movimientos">
      {(todos ? conSaldo : conSaldo.slice(0, 3)).map(({ m, queda }) => <Renglon key={m.id} m={m} queda={queda} />)}
      {conSaldo.length > 3 && <VerMas conSaldo={conSaldo} todos={todos} alTocar={() => setTodos((x) => !x)} />}
    </ul>
  );
}

function VerMas({ conSaldo, todos, alTocar }: { conSaldo: ConSaldo; todos: boolean; alTocar: () => void }) {
  return (
    <li className={css.mov}>
      <span className={css.movIc}><Icono nombre="history" tam={16} /></span>
      <button type="button" className={css.masMovs} onClick={alTocar}>{todos ? "Ver solo los últimos 3" : `Ver ${numero(conSaldo.length - 3)} más, hasta el ${fecha(conSaldo[conSaldo.length - 1]!.m.fecha).slice(0, 5)}`}</button>
      <span /><span className={css.movQueda}>{todos ? "↑" : "↓"}</span>
    </li>
  );
}

function Renglon({ m, queda }: { m: Movimiento; queda: number }) {
  const { nombre, icono, clase } = comoSeVe(m);
  const c = Number(m.cantidad);
  return (
    <li className={css.mov}>
      <span className={`${css.movIc} ${clase}`}><Icono nombre={icono} tam={16} /></span>
      <span className={css.movTexto}><span className={css.movTt}>{nombre} · {fecha(m.fecha)}</span>{m.nota && <span className={css.movNn}>{m.nota}</span>}</span>
      <span className={`${css.movQ} ${c > 0 ? "mas" : ""}`}>{conSigno(c)}</span>
      <span className={css.movQueda}>{numero(queda)}</span>
    </li>
  );
}

const SinMovimientos = () => <p className="detalle">Este producto todavía no tiene movimientos: su stock es cero. Se carga con un ingreso de mercadería, un conteo o corrigiéndolo acá.</p>;
