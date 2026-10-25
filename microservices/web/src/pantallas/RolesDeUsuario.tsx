import type { CambioDeRoles, RolAsignable } from "../negocio/usuarios";
import css from "./comun/negocio/Roles.module.css";

// Los roles de una persona (RF-72, RF-75): una casilla por rol, se tildan varias. Lo usan las
// dos interfaces, en la lista de usuarios y al autorizar a alguien, para que la regla y las
// palabras sean las mismas.
export type { RolAsignable };

// Las casillas, sin más: para el formulario de autorizar a alguien.
export function ElegirRoles({ disponibles, elegidos, alCambiar, nombre }: { disponibles: RolAsignable[]; elegidos: string[]; alCambiar: (ids: string[]) => void; nombre?: string }) {
  return (
    <fieldset className="ru-casillas" data-testid="elegir-roles">
      <legend>{nombre ? `Roles de ${nombre}` : "Roles"}</legend>
      {disponibles.map((r) => (
        <label key={r.id} className={css.permiso}>
          <input type="checkbox" checked={elegidos.includes(r.id)} onChange={() => alCambiar(elegidos.includes(r.id) ? elegidos.filter((x) => x !== r.id) : [...elegidos, r.id])} data-testid={`rol-${r.nombre}`} />
          <span><strong>{r.nombre}</strong>{r.descripcion && <small>{r.descripcion}</small>}</span>
        </label>
      ))}
      {disponibles.length === 0 && <small className={css.bajada}>Buscando los roles…</small>}
    </fieldset>
  );
}

// La elección de roles con «Cancelar» y «Guardar roles», en la ficha de cada persona: la misma en
// el celular y en la computadora.
export function ElegirYGuardarRoles({ nombre, disponibles, cambio: c }: { nombre: string; disponibles: RolAsignable[]; cambio: CambioDeRoles }) {
  return (
    <div className="ru-panel">
      <ElegirRoles disponibles={disponibles} elegidos={c.elegidos} alCambiar={c.elegir} nombre={nombre} />
      {c.error && <p className={css.error} role="alert">{c.error}</p>}
      <div className={css.acciones}>
        <button type="button" className={css.boton} onClick={c.cancelar}>Cancelar</button>
        <button type="button" className={`${css.boton} fuerte`} disabled={c.guardando} onClick={() => void c.guardar()} data-testid="guardar-roles">{c.guardando ? "Guardando…" : "Guardar roles"}</button>
      </div>
    </div>
  );
}
