import type { FiltroDeStock } from "../../../negocio/deposito";
import { numero } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import type { Inventario } from "./useInventario";
import css from "./Inventario.module.css";

// Qué productos mostrar: todos, para revisar (en cero o negativos), negativos y, si se eligió
// arriba, con stock o sin stock. «Sin código» todavía no se puede.
const t = TEXTOS.stock;

export function FiltrosDeStock({ x }: { x: Inventario }) {
  const { cuenta, filtro } = x;
  const chip = (valor: FiltroDeStock, nombre: string, n: number, punto?: string) => <Chip x={x} valor={valor} nombre={nombre} n={n} punto={punto} />;
  return (
    <div className={css.chips} role="group" aria-label="Qué productos mostrar">
      {chip("todos", t.todos.largo, cuenta.total)}
      {chip("revisar", t.paraRevisar.largo, cuenta.enCero + cuenta.negativos, "var(--p-urgente)")}
      {chip("negativo", t.negativo.corto, cuenta.negativos, "var(--p-error)")}
      <button type="button" className={css.chip} disabled title={t.todaviaNo.largo} data-testid="filtro-sin-codigo"><Icono nombre="barcode" tam={16} />{t.sinCodigo.largo} <span className={css.n}>—</span></button>
      {filtro === "con" && chip("con", t.conStock.largo, cuenta.con)}
      {filtro === "cero" && chip("cero", t.sinStock.largo, cuenta.enCero)}
    </div>
  );
}

function Chip({ x, valor, nombre, n, punto }: { x: Inventario; valor: FiltroDeStock; nombre: string; n: number; punto?: string }) {
  return (
    <button type="button" className={`${css.chip} ${x.filtro === valor ? "elegido" : ""}`} aria-pressed={x.filtro === valor} onClick={() => x.setFiltro(valor)} data-testid={`filtro-${valor}`}>
      {punto && <span className={css.punto} style={{ background: punto }} />}{nombre} <span className={css.n}>{numero(n)}</span>
    </button>
  );
}
