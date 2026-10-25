import { pasaElFiltro, sumaDeConfirmadas, type FiltroDeVentas } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { useRef } from "react";
import { useAccionesDelLugar, useEtiqueta } from "../../../plataforma/comandos";
import { Atajo, Icono } from "../base/ui";
import type { ListaDelDia } from "./useListaDelDia";
import css from "./VentasDelDia.module.css";

// Los filtros (todas, cuenta corriente, anuladas, cada uno con cuántas) y el buscador; buscando,
// cuántas se hallaron y cuánto suman. En el buscador se sigue eligiendo la venta, y deshacerlo
// borra lo escrito (o, vacío, sale de él).
const t = TEXTOS.hoy;
const FILTROS = [["todas", t.todas], ["cuenta", t.ctaCte], ["anuladas", t.anuladas]] as const;

export function FiltrosDelDia({ l, alCampo }: { l: ListaDelDia; alCampo: (campo: HTMLInputElement | null) => void }) {
  const { texto, setTexto, halladas } = l;
  const cuantas = (f: FiltroDeVentas) => halladas.filter((v) => pasaElFiltro(v, f)).length;
  const caja = useRef<HTMLInputElement | null>(null);
  useAccionesDelLugar(caja, {
    "lista.siguiente": () => l.mover(1), "lista.anterior": () => l.mover(-1),
    "campo.deshacer": () => { if (texto) setTexto(""); else caja.current?.blur(); },
  });
  const tecla = useEtiqueta("hoy.buscar");
  return (
    <>
      <div className={css.filtros} role="group" aria-label="Filtrar las ventas">
        {FILTROS.map(([f, nombre]) => (
          <button key={f} type="button" className={`${css.chip} ${l.filtro === f ? "elegido" : ""}`} aria-pressed={l.filtro === f} onClick={() => l.setFiltro(f)} data-testid={`filtro-${f}`}>{nombre.largo} ({cuantas(f)})</button>
        ))}
        <label className={`${css.buscar} ${texto ? "con-texto" : ""}`}>
          <Icono nombre="buscar" tam={18} />
          <input ref={(el) => { caja.current = el; alCampo(el); }} type="search" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={t.buscarVenta.largo} aria-label="Buscar una venta" aria-keyshortcuts={tecla} data-testid="buscar-venta" />
          {!texto && <Atajo accion="hoy.buscar" kbd />}
        </label>
      </div>
      {texto.trim() && <span className={`detalle ${css.halladas}`} data-testid="cuantas-halladas">{halladas.length} de {l.todas.length} ventas · suman {pesosCortos(sumaDeConfirmadas(halladas))}</span>}
    </>
  );
}
