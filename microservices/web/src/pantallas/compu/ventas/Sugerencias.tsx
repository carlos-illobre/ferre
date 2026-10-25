import { precioDelProducto, type Producto } from "../../../negocio/catalogo";
import { nombreDeProducto, pesosCortos } from "../../../negocio/formato";
import { detalleDe } from "./detalle";
import { MiniaturaDeProducto } from "./MiniaturaDeProducto";
import { StockDelProducto } from "./StockDelProducto";
import { Atajo } from "../base/ui";
import css from "./Sugerencias.module.css";

// El desplegable de la búsqueda, como la v2 (decisión 126): la foto, el nombre con marca y
// proveedor, el stock en su pastilla y el precio; abajo, las teclas y cuántos encontró.
type Props = { resultados: Producto[]; elegido: number; stock: Map<string, number>; alElegir: (p: Producto) => void; alMarcar: (i: number) => void };

export function Sugerencias({ resultados, elegido, stock, alElegir, alMarcar }: Props) {
  return (
    <div className={`${css.desplegable} anim-asoma`} data-testid="sugerencias">
      <ul className={css.lista} id="vender-sugerencias" role="listbox" aria-label="Productos encontrados">
        {resultados.map((p, i) => <Sugerencia key={p.id} producto={p} marcada={i === elegido} stock={stock.get(p.id)} alElegir={() => alElegir(p)} alMarcar={() => alMarcar(i)} />)}
      </ul>
      <div className={css.pie} aria-hidden="true">
        <span><Atajo accion="lista.anterior" kbd /><Atajo accion="lista.siguiente" kbd /> elegir</span><span><Atajo accion="lista.elegir" kbd /> agrega</span><span><Atajo accion="lista.salir" kbd /> cierra</span>
        <span className="crece" /><span>{resultados.length} {resultados.length === 1 ? "encontrado" : "encontrados"}</span>
      </div>
    </div>
  );
}

function Sugerencia({ producto: p, marcada, stock, alElegir, alMarcar }: { producto: Producto; marcada: boolean; stock: number | undefined; alElegir: () => void; alMarcar: () => void }) {
  const precio = precioDelProducto(p).valor;
  return (
    <li id={`sug-${p.id}`} role="option" aria-selected={marcada} className={css.renglon} onMouseDown={(e) => { e.preventDefault(); alElegir(); }} onMouseEnter={alMarcar}>
      <MiniaturaDeProducto url={p.foto_url} />
      <span className={css.texto}><span className="nombre">{nombreDeProducto(p.descripcion)}</span><span className="detalle">{detalleDe(p) || " "}</span></span>
      <StockDelProducto stock={stock} unidad={p.unidad ?? "unidad"} />
      <span className={precio === null ? "falta-texto" : "importe"}>{precio === null ? "Sin precio" : pesosCortos(precio)}</span>
    </li>
  );
}
