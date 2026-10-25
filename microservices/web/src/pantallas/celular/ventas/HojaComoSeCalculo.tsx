import { precioDe, subtotalDe, type Item } from "../../../negocio/ventas";
import { nombreDeProducto, pesos } from "../../../formato";
import { TEXTOS } from "../../textos";
import { Hoja, Pasos } from "../componentes/base";
import hojas from "./hojas.module.css";

// Cómo se calculó el precio del renglón, paso a paso, y el redondeo.
export function HojaComoSeCalculo({ item: it, alCerrar }: { item: Item; alCerrar: () => void }) {
  const renglon = subtotalDe(it);
  const pasos = [...precioDe(it).pasos, ...(renglon?.pasos ?? []), ...(renglon ? [`Total del renglón: ${pesos(renglon.valor)}`] : [])];
  return (
    <Hoja titulo="Cómo se calculó" alCerrar={alCerrar} testId="hoja-explicacion">
      <p className={hojas.detalle}>{nombreDeProducto(it.descripcion)}{it.producto?.proveedor ? ` · ${it.producto.proveedor}` : ""}</p>
      <Pasos pasos={pasos} />
      <p className={hojas.detalle}>{TEXTOS.vender.redondeo.corto}</p>
      <button type="button" className="boton tinta" onClick={alCerrar}>Listo</button>
    </Hoja>
  );
}
