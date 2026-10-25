import { enteras, type Unidad } from "../../../negocio/catalogo";
import { MARGENES, precioDeVenta } from "../../../negocio/precios";
import { precioDe, subtotalDe, type Item } from "../../../negocio/ventas";
import { nombreDeProducto, pesos, pesosCortos } from "../../../formato";
import { Contador, Hoja, Icono } from "../componentes/base";
import { POR_UNIDAD } from "./por-unidad";
import { PrecioAMano } from "./PrecioAMano";
import { UnidadDelRenglon } from "./UnidadDelRenglon";
import hojas from "./hojas.module.css";
import css from "./HojaDelRenglon.module.css";

// La hoja de un renglón: el margen (cada uno con su precio), el precio a mano, la cantidad y
// «Quitar de la venta».
type Props = { item: Item; alCerrar: () => void; alCambiar: (c: Partial<Item>) => void; alElegirMargen: (m: number) => void; alCambiarUnidad: (u: Unidad) => void; alQuitar: () => void };

export function HojaDelRenglon({ item: it, alCerrar, alCambiar, alElegirMargen, alCambiarUnidad, alQuitar }: Props) {
  const p = precioDe(it);
  const renglon = subtotalDe(it);
  return (
    <Hoja titulo={nombreDeProducto(it.descripcion)} alCerrar={alCerrar} testId="hoja-renglon">
      <p className={hojas.detalle}>{p.unitario === null ? "Sin precio: elegí el margen o ponelo a mano" : `${pesos(p.unitario)} ${POR_UNIDAD[it.unidad]}`}</p>
      {p.costo !== null && <OpcionesDeMargen item={it} alElegir={alElegirMargen} />}
      <label className={css.fila}><span>Otro precio solo para esta venta</span><PrecioAMano item={it} alCambiar={alCambiar} placeholder="a mano" clase={css.aMano} dentroDeEtiqueta /></label>
      <div className={`${css.fila} ${css.cantidad}`}><span>Cantidad</span>
        <Contador valor={it.cantidad} entera={enteras(it.unidad)} alCambiar={(v) => alCambiar({ cantidad: v })} testId="cantidad-hoja">
          <UnidadDelRenglon unidad={it.unidad} alCambiar={alCambiarUnidad} testId="unidad-hoja" />
        </Contador>
        <b className="importe">{renglon ? pesosCortos(renglon.valor) : ""}</b>
      </div>
      <button type="button" className={`boton ${css.quitar} ${hojas.ancho}`} onClick={alQuitar} data-testid="quitar"><Icono nombre="tacho" tam={20} />Quitar de la venta</button>
      <button type="button" className={`boton tinta ${hojas.ancho}`} onClick={alCerrar}>Listo</button>
    </Hoja>
  );
}

// Cada margen con el precio que daría.
function OpcionesDeMargen({ item: it, alElegir }: { item: Item; alElegir: (m: number) => void }) {
  const p = precioDe(it);
  return (
    <div className={css.opciones}>
      {MARGENES.map((m) => (
        <button key={m} type="button" className={it.precioManual === null && p.margen === m ? css.elegido : ""} onClick={() => alElegir(m)} aria-label={`${m} %`}>
          {m} %<small>{pesosCortos(precioDeVenta({ costoNeto: p.costo!, margen: m, iva: p.iva }).valor)}</small>
        </button>
      ))}
    </div>
  );
}
