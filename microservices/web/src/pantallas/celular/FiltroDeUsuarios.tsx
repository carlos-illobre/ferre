import { partesResaltadas } from "../../negocio/usuarios";
import type { useFiltroDeUsuarios } from "../filtro-de-usuarios";
import type { RolAsignable } from "../RolesDeUsuario";
import { TEXTOS } from "../textos";
import type { Persona } from "./TarjetaDeUsuario";

// Debajo de «Autorizar otro correo de Google» (decisión 98): el buscador, con las sugerencias del
// ancho de la fila, y la lista «Rol», que se marca en verde con un rol elegido.
const iniciales = (nombre: string) => nombre.trim().split(/\s+/).map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();

export function FiltroDeUsuarios<U extends Persona>({ filtro: f, roles }: { filtro: ReturnType<typeof useFiltroDeUsuarios<U>>; roles: RolAsignable[] }) {
  const t = TEXTOS.usuarios;
  return (
    <div className="fu" data-testid="filtro-usuarios">
      <div className="fu-fila">
        <div className="fu-caja">
          <svg className="fu-lupa" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input {...f.combo} type="search" value={f.texto} placeholder={t.correoONombre.corto} aria-label={t.buscar.corto} autoComplete="off" autoCapitalize="none" spellCheck={false}
            onChange={(e) => f.escribir(e.target.value)} onKeyDown={f.alTeclear} onBlur={f.cerrar} data-testid="buscar-usuario" />
          {f.texto && <button type="button" className="fu-borrar" onClick={f.borrar} aria-label={t.borrarBusqueda.corto}>✕</button>}
        </div>
        <label className={`fu-rol ${f.rol ? "si" : ""}`}>
          <span>{t.rol.corto}</span>
          <select value={f.rol ?? ""} onChange={(e) => f.elegirRol(e.target.value)} data-testid="filtro-rol">
            <option value="">{t.todosLosRoles.corto}</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select>
        </label>
        {f.sugerencias.length > 0 && (
          <ul className="fu-sugerencias" id={f.listaId} role="listbox" aria-label={t.buscar.corto}>
            {f.sugerencias.map((u, i) => {
              const [antes, igual, despues] = partesResaltadas(u.email, f.texto);
              return (
                <li key={u.id} id={f.opcionId(i)} role="option" aria-selected={i === f.activa} className={i === f.activa ? "activa" : ""}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => f.elegir(u)} data-testid="sugerencia-usuario">
                  <span className="fu-av" aria-hidden="true">{iniciales(u.nombre)}</span>
                  <span><span className="fu-correo">{antes}<b>{igual}</b>{despues}</span><small>{u.nombre}</small></span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {f.resumen && <p className="fu-resultado" role="status" data-testid="cuantos-quedan">{f.resumen}</p>}
    </div>
  );
}
