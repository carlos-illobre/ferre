import { fecha } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { diaYMes, subida } from "../../comun/catalogo/fechas-de-listas";
import type { ListaFila } from "../../../negocio/catalogo";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Atajo, Icono } from "../base/ui";
import type { ListasDeLaCompu } from "./useListasDeLaCompu";
import css from "./Listas.module.css";

// Las listas que esperan revisión, cada una con su número (la tecla que la abre, si tiene).
export function PendientesDeRevisar({ x }: { x: ListasDeLaCompu }) {
  if (x.sinAplicar.length === 0) return null;
  const elegida = !x.cargada && !x.resultado ? x.pendienteElegida?.id : undefined;
  return (
    <section aria-labelledby="lv-revisar">
      <h2 id="lv-revisar" className={css.cab}><b>{TEXTOS.listas.paraRevisar.largo}</b><span className={`${css.cuenta} ambar`}>{x.sinAplicar.length}</span></h2>
      <ul className={css.filas}>
        {x.sinAplicar.map((l, i) => <Pendiente key={l.id} l={l} numero={i + 1} elegida={l.id === elegida} alAbrir={() => x.abrir(l)} />)}
      </ul>
    </section>
  );
}

function Pendiente({ l, numero, elegida, alAbrir }: { l: ListaFila; numero: number; elegida: boolean; alAbrir: () => void }) {
  const accion = `listas.pendiente.${numero}`;
  return (
    <li>
      <button type="button" className={`${css.fila} ${elegida ? "elegida" : ""}`} onClick={alAbrir} data-testid="lista-pendiente"
        aria-label={`Revisar y aplicar la lista de ${l.proveedor} del ${fecha(l.fecha_lista)}`} aria-keyshortcuts={useEtiqueta(accion)}>
        <span className={css.ic}><Icono nombre="excel" /></span>
        <span className={css.texto}><b>{l.proveedor}</b><span>{diaYMes(l.fecha_lista)} · subida {subida(l.creado_en)}</span></span>
        <Atajo accion={accion} />
      </button>
    </li>
  );
}
