import { TEXTOS } from "../../textos";
import { Boton, Vacio } from "../base/ui";
import { irA } from "../base/rutas";
import { FiltrosDelDia } from "./FiltrosDelDia";
import { LaVentaElegida } from "./LaVentaElegida";
import { TablaDelDia } from "./TablaDelDia";
import type { ListaDelDia } from "./useListaDelDia";
import css from "./VentasDelDia.module.css";

// Debajo del resumen: los filtros y el buscador, la tabla del día y, a la derecha, la venta elegida.
// Sin ventas, que no hubo (y, hoy, ir a vender).
const t = TEXTOS.hoy;

export function ListaYVentaElegida({ l, alCampo }: { l: ListaDelDia; alCampo: (campo: HTMLInputElement | null) => void }) {
  const { r, elegida } = l;
  if (l.todas.length === 0) {
    return (
      <div data-testid="sin-ventas"><Vacio icono="ventas" titulo={r.esHoy ? t.sinVentasHoy.largo : t.sinVentasDia.largo}
        accion={r.esHoy ? <Boton variante="principal" icono="vender" onClick={() => irA("vender")}>{t.irAVender.largo}</Boton> : undefined} /></div>
    );
  }
  return (
    <div className={css.abajo}>
      <div className={css.izq}>
        <FiltrosDelDia l={l} alCampo={alCampo} />
        <TablaDelDia ventas={l.visibles} buscado={l.texto} elegida={elegida} alElegir={l.elegir} />
      </div>
      {elegida && <LaVentaElegida key={elegida.id} venta={elegida} l={l} />}
    </div>
  );
}
