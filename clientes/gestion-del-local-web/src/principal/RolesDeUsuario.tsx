import { useEffect, useState } from "react";
import { api } from "../api";
import "./roles.css";

// Los roles de una persona (RF-72, RF-75): una casilla por rol, se tildan varias. Lo usan las
// dos interfaces, en la lista de usuarios y al autorizar a alguien, para que la regla y las
// palabras sean las mismas.
export type RolAsignable = { id: string; nombre: string; descripcion?: string | null };

export function useRolesAsignables(): RolAsignable[] {
  const [roles, setRoles] = useState<RolAsignable[]>([]);
  useEffect(() => { api<RolAsignable[]>("/roles").then(setRoles).catch(() => undefined); }, []);
  return roles;
}

// Las casillas, sin más: para el formulario de autorizar a alguien.
export function ElegirRoles({ disponibles, elegidos, alCambiar, nombre }: { disponibles: RolAsignable[]; elegidos: string[]; alCambiar: (ids: string[]) => void; nombre?: string }) {
  return (
    <fieldset className="ru-casillas" data-testid="elegir-roles">
      <legend>{nombre ? `Roles de ${nombre}` : "Roles"}</legend>
      {disponibles.map((r) => (
        <label key={r.id} className="rl-permiso">
          <input type="checkbox" checked={elegidos.includes(r.id)} onChange={() => alCambiar(elegidos.includes(r.id) ? elegidos.filter((x) => x !== r.id) : [...elegidos, r.id])} data-testid={`rol-${r.nombre}`} />
          <span><strong>{r.nombre}</strong>{r.descripcion && <small>{r.descripcion}</small>}</span>
        </label>
      ))}
      {disponibles.length === 0 && <small className="rl-bajada">Buscando los roles…</small>}
    </fieldset>
  );
}

// En la lista de usuarios: se ven los roles que tiene y, al tocar «Cambiar roles», las casillas.
export function RolesDeUsuario({ disponibles, actuales, nombre, bloqueado, alGuardar }: {
  disponibles: RolAsignable[]; actuales: RolAsignable[]; nombre: string; bloqueado?: boolean; alGuardar: (ids: string[]) => Promise<string | null>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  async function guardar() {
    if (elegidos.length === 0) { setError("Elegí al menos un rol. Para que no pueda nada, desactivá al usuario."); return; }
    setGuardando(true); setError(null);
    const falla = await alGuardar(elegidos);
    setGuardando(false);
    if (falla) setError(falla); else setAbierto(false);
  }
  return (
    <div className="ru" data-testid="roles-de-usuario">
      <ul className="rl-permisos-del-rol" aria-label={`Roles de ${nombre}`}>
        {actuales.length ? actuales.map((r) => <li key={r.id}>{r.nombre}</li>) : <li className="ru-sin">Sin roles</li>}
      </ul>
      {!abierto && <button type="button" className="rl-boton ru-cambiar" disabled={bloqueado} onClick={() => { setElegidos(actuales.map((r) => r.id)); setError(null); setAbierto(true); }} aria-label={`Cambiar los roles de ${nombre}`} data-testid="cambiar-roles">Cambiar roles</button>}
      {abierto && (
        <div className="ru-panel">
          <ElegirRoles disponibles={disponibles} elegidos={elegidos} alCambiar={(ids) => { setElegidos(ids); setError(null); }} nombre={nombre} />
          {error && <p className="rl-error" role="alert">{error}</p>}
          <div className="rl-acciones">
            <button type="button" className="rl-boton" onClick={() => setAbierto(false)}>Cancelar</button>
            <button type="button" className="rl-boton fuerte" disabled={guardando} onClick={() => void guardar()} data-testid="guardar-roles">{guardando ? "Guardando…" : "Guardar roles"}</button>
          </div>
        </div>
      )}
    </div>
  );
}
