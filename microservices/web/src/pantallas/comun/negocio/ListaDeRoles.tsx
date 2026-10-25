import { quienesLoTienen, type Rol, type Roles } from "../../../negocio/usuarios";
import css from "./Roles.module.css";

// Cada rol con quiénes lo tienen, sus permisos, «Cambiar» y, si nadie lo tiene, «Borrar».
export function ListaDeRoles({ x, alCambiar, alBorrar }: { x: Roles; alCambiar: (r: Rol) => void; alBorrar: (r: Rol) => void }) {
  return (
    <ul className={css.lista} data-testid="lista-de-roles">
      {(x.roles ?? []).map((r) => (
        <li key={r.id} className={css.tarjeta} data-testid="rol">
          <header>
            <h2>{r.nombre}</h2>
            <span className={css.cuantos}>{quienesLoTienen(r.usuarios)}</span>
          </header>
          {r.descripcion && <p className={css.bajada}>{r.descripcion}</p>}
          <ul className={css.permisosDelRol}>{r.permisos.map((p) => <li key={p}>{x.nombreDe(p)}</li>)}</ul>
          <div className={css.acciones}>
            <button type="button" className={css.boton} onClick={() => alCambiar(r)} data-testid="cambiar-rol">Cambiar</button>
            {r.usuarios === 0
              ? <button type="button" className={`${css.boton} peligro`} onClick={() => alBorrar(r)} data-testid="borrar-rol">Borrar</button>
              : <small className={css.bajada}>Para borrarlo, primero sacáselo a quien lo tiene.</small>}
          </div>
        </li>
      ))}
    </ul>
  );
}
