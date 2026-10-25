import { pasaElFiltro, sumaDeConfirmadas, type FiltroDeVentas } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Icono, pesosCortos } from "../base/ui";
import type { ListaDelDia } from "./useListaDelDia";
import css from "./VentasDelDia.module.css";

// Los filtros (todas, cuenta corriente, anuladas, cada uno con cuántas) y el buscador (/ o Ctrl+K);
// buscando, cuántas se hallaron y cuánto suman.
const t = TEXTOS.hoy;
const FILTROS = [["todas", t.todas], ["cuenta", t.ctaCte], ["anuladas", t.anuladas]] as const;

export function FiltrosDelDia({ l, alCampo }: { l: ListaDelDia; alCampo: (campo: HTMLInputElement | null) => void }) {
  const { texto, setTexto, halladas } = l;
  const cuantas = (f: FiltroDeVentas) => halladas.filter((v) => pasaElFiltro(v, f)).length;
  return (
    <>
      <div className={css.filtros} role="group" aria-label="Filtrar las ventas">
        {FILTROS.map(([f, nombre]) => (
          <button key={f} type="button" className={`${css.chip} ${l.filtro === f ? "elegido" : ""}`} aria-pressed={l.filtro === f} onClick={() => l.setFiltro(f)} data-testid={`filtro-${f}`}>{nombre.largo} ({cuantas(f)})</button>
        ))}
        <label className={`${css.buscar} ${texto ? "con-texto" : ""}`}>
          <Icono nombre="buscar" tam={18} />
          <input ref={alCampo} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t.buscarVenta.largo} aria-label="Buscar una venta" aria-keyshortcuts="/ Control+K" data-testid="buscar-venta"
            onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); if (texto) setTexto(""); else e.currentTarget.blur(); } }} />
          {!texto && <kbd className="tecla">/</kbd>}
        </label>
      </div>
      {texto.trim() && <span className={`detalle ${css.halladas}`} data-testid="cuantas-halladas">{halladas.length} de {l.todas.length} ventas · suman {pesosCortos(sumaDeConfirmadas(halladas))}</span>}
    </>
  );
}
