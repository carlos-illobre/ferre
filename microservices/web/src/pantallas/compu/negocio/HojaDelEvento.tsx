import { nombreDe, type Evento } from "../../../negocio/actividad";
import { aplanar, detalleDe, queFue } from "../../comun/negocio/actividad-en-palabras";
import { Boton, Hoja } from "../base/ui";
import { fechaCompleta } from "./negocio-comun";

// Todo lo anotado de una acción.
export function HojaDelEvento({ evento: e, alCerrar }: { evento: Evento; alCerrar: () => void }) {
  const detalle = detalleDe(e);
  return (
    <Hoja titulo={queFue(e).nombre} alCerrar={alCerrar} testId="hoja-evento" pie={<Boton variante="marino" onClick={alCerrar}>Entendido</Boton>}>
      {detalle && <p className="actividad-resumen">{detalle}</p>}
      <dl className="actividad-datos">
        <div><dt>Cuándo</dt><dd>{fechaCompleta(e.fecha)}</dd></div>
        <div><dt>Quién</dt><dd>{nombreDe(e) ?? "El sistema"}</dd></div>
        {aplanar(e.contenido).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </Hoja>
  );
}
