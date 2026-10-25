import { UNIDADES, type Unidad } from "../../negocio/catalogo";

// La unidad de un renglón (por unidad, kilo, metro o litro), al lado de su cantidad.
export function SelectorDeUnidad({ unidad, alCambiar }: { unidad: Unidad; alCambiar: (u: Unidad) => void }) {
  return (
    <select value={unidad} onChange={(e) => alCambiar(e.target.value as Unidad)} aria-label="Unidad: por unidad, kilo, metro o litro" data-testid="unidad">
      {UNIDADES.map((u) => <option key={u.valor} value={u.valor}>{u.nombre}</option>)}
    </select>
  );
}
