import { paginasDe, rangoDeLaPagina } from "../../../negocio/actividad";
import { Icono } from "../../../ui/iconos";
import type { ActividadDeLaCompu } from "./useActividadDeLaCompu";
import css from "./Actividad.module.css";

// De cuál a cuál, y las páginas: las de alrededor de la actual (o las cinco primeras o últimas).
const cercanas = (pagina: number, paginas: number) => Array.from({ length: paginas }, (_, i) => i + 1).filter((n) => Math.abs(n - pagina) <= 2 || (pagina <= 2 && n <= 5) || (pagina >= paginas - 1 && n > paginas - 5));

export function PaginadorDelRegistro({ x }: { x: ActividadDeLaCompu }) {
  const { pagina, cargando } = x;
  const paginas = paginasDe(x.datos);
  const r = rangoDeLaPagina(x.datos);
  return (
    <nav className={css.pie} data-testid="paginado" aria-label="Páginas del registro">
      <span className={css.detalle}>{r.desde} a {r.hasta} de {x.datos!.total.toLocaleString("es-AR")} · <span className={css.kbd}>↑</span> <span className={css.kbd}>↓</span> recorren, <span className={css.kbd}>Enter</span> abre</span>
      <span className={css.paginador}>
        <button type="button" className={`${css.boton} icono`} disabled={pagina <= 1 || cargando} onClick={() => x.setPagina((p) => p - 1)} aria-label="Anteriores" data-testid="anteriores"><Icono nombre="chevron-left" tam={16} /></button>
        {cercanas(pagina, paginas).map((n) => <button key={n} type="button" className={`${css.pag} ${n === pagina ? "actual" : ""}`} aria-current={n === pagina ? "page" : undefined} onClick={() => x.setPagina(n)} disabled={cargando}>{n}</button>)}
        <button type="button" className={css.boton} disabled={pagina >= paginas || cargando} onClick={() => x.setPagina((p) => p + 1)} data-testid="siguientes">Siguiente <Icono nombre="chevron-right" tam={16} /></button>
      </span>
    </nav>
  );
}
