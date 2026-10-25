import { useState, type FormEvent } from "react";
import { faltaEnElRol, type BorradorDeRol, type Roles } from "../../../negocio/usuarios";
import css from "./Roles.module.css";

// El rol nuevo o el que se cambia: su nombre y los permisos, agrupados por parte del sistema.
export function RolEnEdicion({ x, borrador, alCambiar }: { x: Roles; borrador: BorradorDeRol; alCambiar: (b: BorradorDeRol | null) => void }) {
  const [falta, setFalta] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const cambiar = (b: BorradorDeRol) => { alCambiar(b); setFalta(null); };
  const alternar = (clave: string) => { const p = new Set(borrador.permisos); if (p.has(clave)) p.delete(clave); else p.add(clave); cambiar({ ...borrador, permisos: p }); };
  async function guardar(e: FormEvent) {
    e.preventDefault();
    const falto = faltaEnElRol(borrador);
    if (falto) { setFalta(falto); return; }
    setGuardando(true); setFalta(null);
    setFalta(await x.guardar(borrador, () => alCambiar(null)));
    setGuardando(false);
  }
  return (
    <form className={css.tarjeta} onSubmit={guardar} data-testid="rol-en-edicion" noValidate>
      <h2>{borrador.id ? "Cambiar el rol" : "Rol nuevo"}</h2>
      <label className={css.campo}><span>Nombre del rol</span>
        <input value={borrador.nombre} maxLength={40} autoComplete="off" onChange={(e) => cambiar({ ...borrador, nombre: e.target.value })} placeholder="Ej.: Encargado" data-testid="nombre-rol" />
      </label>
      {x.partes.map((parte) => (
        <fieldset key={parte} className={css.parte}>
          <legend>{parte}</legend>
          {x.permisos.filter((p) => p.parte === parte).map((p) => (
            <label key={p.clave} className={css.permiso}>
              <input type="checkbox" checked={borrador.permisos.has(p.clave)} onChange={() => alternar(p.clave)} data-testid={`permiso-${p.clave}`} />
              <span><strong>{p.nombre}</strong><small>{p.detalle}</small></span>
            </label>
          ))}
        </fieldset>
      ))}
      {falta && <p className={css.error} role="alert">{falta}</p>}
      <div className={css.acciones}>
        <button type="button" className={css.boton} onClick={() => alCambiar(null)}>Cancelar</button>
        <button type="submit" className={`${css.boton} fuerte`} disabled={guardando} data-testid="guardar-rol">{guardando ? "Guardando…" : "Guardar el rol"}</button>
      </div>
    </form>
  );
}
