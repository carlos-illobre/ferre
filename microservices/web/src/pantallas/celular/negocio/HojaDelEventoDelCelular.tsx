import type { Evento } from "../../../negocio/actividad";
import type { UsuarioFila } from "../../../negocio/usuarios";
import { aplanar, detalleDe, queFue } from "../../comun/negocio/actividad-en-palabras";
import { Hoja } from "../componentes/base";
import css from "./Actividad.module.css";

const fechaCompleta = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// La hoja de una acción: el detalle en palabras, cuándo, quién y todo lo que se anotó.
export function HojaDelEventoDelCelular({ evento: e, usuarios, alCerrar }: { evento: Evento; usuarios: UsuarioFila[]; alCerrar: () => void }) {
  const detalle = detalleDe(e, usuarios);
  return (
    <Hoja titulo={queFue(e).nombre} alCerrar={alCerrar} testId="hoja-evento">
      {detalle && <p className={css.resumen}>{detalle}</p>}
      <dl className={css.kv}>
        <dt>Cuándo</dt><dd>{fechaCompleta(e.fecha)}</dd>
        <dt>Quién</dt><dd>{e.nombre ? `${e.nombre} (${e.email})` : "El sistema"}</dd>
        {aplanar(e.contenido).map(([k, v]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
    </Hoja>
  );
}
