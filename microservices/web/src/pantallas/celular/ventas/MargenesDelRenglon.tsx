import { MARGENES } from "../../../negocio/precios";
import type { Item } from "../../../negocio/ventas";
import { precioDe } from "../../../negocio/ventas";
import { Icono } from "../componentes/base";
import css from "./Renglon.module.css";

// Sin precio, los márgenes para elegir ahí mismo y «$» para ponerlo a mano.
export function MargenesSinPrecio({ conCosto, alElegir, alAMano }: { conCosto: boolean; alElegir: (m: number) => void; alAMano: () => void }) {
  return (
    <div className={css.margenes}>
      {conCosto && MARGENES.map((m) => <button key={m} type="button" onClick={() => alElegir(m)} aria-label={`${m} %`}>{m}</button>)}
      <button type="button" onClick={alAMano} aria-label="Precio a mano">$</button>
    </div>
  );
}

// El margen elegido (o «a mano»), que abre la hoja del renglón para cambiarlo.
export function MargenDelRenglon({ item: it, alAbrir }: { item: Item; alAbrir: () => void }) {
  const texto = it.precioManual !== null ? "a mano" : `${precioDe(it).margen} %`;
  return (
    <button type="button" className={css.margen} onClick={alAbrir} aria-label={`Margen: ${texto}`} data-testid="margen">
      {texto}<Icono nombre="abajo" tam={14} grosor={2.6} />
    </button>
  );
}
