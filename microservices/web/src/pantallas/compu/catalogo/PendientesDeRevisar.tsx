import { fecha } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { diaYMes, subida } from "../../comun/catalogo/fechas-de-listas";
import { Icono } from "../base/ui";
import type { ListasDeLaCompu } from "./useListasDeLaCompu";
import css from "./Listas.module.css";

// Las listas que esperan revisión, cada una con su número (1 a 9 la abren).
export function PendientesDeRevisar({ x }: { x: ListasDeLaCompu }) {
  if (x.sinAplicar.length === 0) return null;
  const elegida = !x.cargada && !x.resultado ? x.pendienteElegida?.id : undefined;
  return (
    <section aria-labelledby="lv-revisar">
      <h2 id="lv-revisar" className={css.cab}><b>{TEXTOS.listas.paraRevisar.largo}</b><span className={`${css.cuenta} ambar`}>{x.sinAplicar.length}</span></h2>
      <ul className={css.filas}>
        {x.sinAplicar.map((l, i) => (
          <li key={l.id}>
            <button type="button" className={`${css.fila} ${l.id === elegida ? "elegida" : ""}`} onClick={() => x.abrir(l)} data-testid="lista-pendiente"
              aria-label={`Revisar y aplicar la lista de ${l.proveedor} del ${fecha(l.fecha_lista)}`} aria-keyshortcuts={i < 9 ? String(i + 1) : undefined}>
              <span className={css.ic}><Icono nombre="excel" /></span>
              <span className={css.texto}><b>{l.proveedor}</b><span>{diaYMes(l.fecha_lista)} · subida {subida(l.creado_en)}</span></span>
              {i < 9 && <kbd className="tecla" aria-hidden="true">{i + 1}</kbd>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
