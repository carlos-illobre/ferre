import { AL_ABRIR_EL_REGISTRO, paginasDe, type FiltrosDelRegistro } from "../../../negocio/actividad";
import { Boton, Vacio } from "../base/ui";
import type { ActividadDeLaCompu } from "./useActividadDeLaCompu";
import css from "./Actividad.module.css";

// Cuántas acciones hay en el período, en qué página se está, y qué decir si no hay ninguna.
export const enPalabras = (f: FiltrosDelRegistro) => f.periodo === "hoy" ? "hoy" : f.periodo === "ayer" ? "ayer" : f.periodo === "semana" ? "esta semana"
  : f.desde && f.hasta ? `del ${f.desde.slice(8)}/${f.desde.slice(5, 7)} al ${f.hasta.slice(8)}/${f.hasta.slice(5, 7)}` : f.desde ? `desde el ${f.desde.slice(8)}/${f.desde.slice(5, 7)}` : f.hasta ? `hasta el ${f.hasta.slice(8)}/${f.hasta.slice(5, 7)}` : "en todo el registro";

export function TotalDelRegistro({ x }: { x: ActividadDeLaCompu }) {
  const { datos } = x;
  return (
    <div className={css.total} role="status" aria-live="polite" data-testid="cuenta">
      {datos ? <><b>{datos.total.toLocaleString("es-AR")} {datos.total === 1 ? "acción" : "acciones"}</b><span className={`${css.detalle} ${css.crece}`}>{enPalabras(x.filtros)}, de la más nueva a la más vieja</span>{datos.total > 0 && <span className={css.detalle}>Página <b>{datos.pagina}</b> de <b>{paginasDe(datos)}</b></span>}</>
        : !x.error && <span className={css.detalle}>Trayendo el registro…</span>}
      {x.cargando && datos && <span className={css.detalle}>Trayendo la página…</span>}
    </div>
  );
}

export function SinAcciones({ x }: { x: ActividadDeLaCompu }) {
  if (!x.datos || x.datos.total !== 0) return null;
  return (
    <div className="tarjeta">
      {x.conFiltros
        ? <Vacio icono="filtro" titulo="No hay acciones con esos filtros" accion={<Boton onClick={() => { x.setFiltros({ ...AL_ABRIR_EL_REGISTRO, periodo: "rango" }); x.setPagina(1); }}>Ver todo el registro</Boton>}>Probá con otro día, otra persona u otro tipo de acción.</Vacio>
        : <Vacio icono="actividad" titulo="Hoy todavía no hay acciones" accion={<Boton onClick={() => x.filtrar({ periodo: "rango" })}>Ver todo el registro</Boton>}>Apenas alguien venda, compre o cambie un precio, queda anotado acá.</Vacio>}
    </div>
  );
}
