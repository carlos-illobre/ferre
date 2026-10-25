import { CATEGORIAS } from "../../comun/negocio/actividad-en-palabras";
import type { Periodo } from "../../../negocio/actividad";
import { Icono } from "../../../ui/iconos";
import type { ActividadDeLaCompu } from "./useActividadDeLaCompu";
import deUsuarios from "./Usuarios.module.css";
import css from "./Actividad.module.css";

// Los filtros en una fila: quién, el período en segmentos (con «Desde… hasta», que abre los días) y qué.
const PERIODOS: { valor: Periodo; nombre: string }[] = [{ valor: "hoy", nombre: "Hoy" }, { valor: "ayer", nombre: "Ayer" }, { valor: "semana", nombre: "Esta semana" }];

export function FiltrosDelRegistro({ x }: { x: ActividadDeLaCompu }) {
  const { filtros, filtrar } = x;
  return (
    <>
      <form className={css.filtros} role="search" aria-label="Filtros del registro" onSubmit={(e) => e.preventDefault()} data-testid="filtros">
        <label className={`${css.selector} ${filtros.usuario ? "puesto" : ""}`}>
          <span className={css.et}>Quién</span>
          <select value={filtros.usuario} onChange={(e) => filtrar({ usuario: e.target.value })} data-testid="filtro-usuario">
            <option value="">Todos</option>
            {x.usuarios.map((u) => <option key={u.id} value={u.id}>{u.nombre}{u.activo ? "" : " (desactivado)"}</option>)}
          </select>
          <Icono nombre="chevron-down" tam={16} />
        </label>
        <div className={css.segmentos} role="group" aria-label="Período">
          {PERIODOS.map((p) => <button key={p.valor} type="button" className={filtros.periodo === p.valor ? "elegido" : ""} aria-pressed={filtros.periodo === p.valor} onClick={() => { x.setRango(false); filtrar({ periodo: p.valor }); }} data-testid={`periodo-${p.valor}`}>{p.nombre}</button>)}
          <button type="button" className={filtros.periodo === "rango" ? "elegido" : ""} aria-pressed={filtros.periodo === "rango"} aria-expanded={x.rango} onClick={() => { x.setRango((r) => !r); filtrar({ periodo: "rango" }); }} data-testid="periodo-rango"><Icono nombre="calendar" tam={16} />Desde… hasta</button>
        </div>
        <label className={`${css.selector} ${filtros.grupo || filtros.tipo ? "puesto" : ""}`}>
          <span className={css.et}>Qué</span>
          <select value={filtros.grupo || (filtros.tipo ? "tipo" : "")} onChange={(e) => filtrar({ grupo: e.target.value, tipo: "" })} data-testid="filtro-tipo">
            <option value="">Todo</option>
            {/* Lo elegido en «Qué pasó» (un tipo) se muestra, pero no se elige desde acá. */}
            {filtros.tipo && !filtros.grupo && <option value="tipo" disabled>{CATEGORIAS.find((c) => c.tipo === filtros.tipo)?.nombre ?? filtros.tipo}</option>}
            {x.grupos.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <Icono nombre="chevron-down" tam={16} />
        </label>
        {x.conFiltros && <button type="button" className={`${css.boton} fantasma`} onClick={x.quitarFiltros} data-testid="quitar-filtros"><Icono nombre="x" tam={16} />Quitar filtros</button>}
      </form>
      {x.rango && <RangoDeDias x={x} />}
    </>
  );
}

function RangoDeDias({ x }: { x: ActividadDeLaCompu }) {
  const { filtros, filtrar } = x;
  const alReves = Boolean(filtros.periodo === "rango" && filtros.desde && filtros.hasta && filtros.desde > filtros.hasta);
  return (
    <div className={css.rango}>
      <label className="campo"><span>Desde el día</span><input className="entrada" type="date" value={filtros.desde} max={filtros.hasta || undefined} onChange={(e) => filtrar({ desde: e.target.value })} aria-invalid={alReves} data-testid="filtro-desde" /></label>
      <label className="campo"><span>Hasta el día</span><input className="entrada" type="date" value={filtros.hasta} min={filtros.desde || undefined} onChange={(e) => filtrar({ hasta: e.target.value })} aria-invalid={alReves} data-testid="filtro-hasta" /></label>
      <span className={deUsuarios.detalle}>Sin días, se ve todo el registro.</span>
      {alReves && <small className="actividad-fechas" role="alert">El «desde» es posterior al «hasta»: así no hay días para mostrar.</small>}
    </div>
  );
}
