import { abreviarUnidad, UNIDADES, type Unidad } from "../../../negocio/catalogo";
import css from "./UnidadDelRenglon.module.css";

// La unidad adentro de la cantidad, que se toca para elegir otra (decisión 140): en el renglón y en su hoja.
export function UnidadDelRenglon({ unidad, alCambiar, testId = "unidad" }: { unidad: Unidad; alCambiar: (u: Unidad) => void; testId?: string }) {
  return (
    <label className={css.unidad}>
      <span aria-hidden="true" data-testid={`${testId}-renglon`}>{abreviarUnidad(unidad)}</span>
      <select value={unidad} onChange={(e) => alCambiar(e.target.value as Unidad)} aria-label="Unidad" data-testid={testId}>
        {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.nombre}</option>)}
      </select>
    </label>
  );
}
