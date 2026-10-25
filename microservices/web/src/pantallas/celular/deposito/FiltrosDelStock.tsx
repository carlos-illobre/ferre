import type { CuentaDelStock, FiltroDeStock } from "../../../negocio/deposito";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Stock.module.css";

// Los filtros en pastillas: para revisar, todos y «sin código» (todavía no).
const t = TEXTOS.stock;
const num = (n: number) => n.toLocaleString("es-AR");

export function FiltrosDelStock({ cuenta, filtro, alElegir }: { cuenta: CuentaDelStock; filtro: FiltroDeStock; alElegir: (f: FiltroDeStock) => void }) {
  return (
    <div className={css.chips} role="group" aria-label="Qué productos mostrar">
      <button type="button" className={`${css.chip} ${filtro === "revisar" ? "elegido" : ""}`} aria-pressed={filtro === "revisar"} onClick={() => alElegir("revisar")} data-testid="filtro-revisar">{t.paraRevisar.corto} {num(cuenta.enCero + cuenta.negativos)}</button>
      <button type="button" className={`${css.chip} ${filtro === "todos" ? "elegido" : ""}`} aria-pressed={filtro === "todos"} onClick={() => alElegir("todos")} data-testid="filtro-todos">{t.todos.corto} {num(cuenta.total)}</button>
      <button type="button" className={css.chip} disabled data-testid="filtro-sin-codigo"><Icono nombre="barcode" tam={16} />{t.sinCodigo.corto} —</button>
    </div>
  );
}
