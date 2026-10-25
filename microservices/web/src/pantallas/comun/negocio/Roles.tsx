import { useState, type ReactNode } from "react";
import { useRoles, type BorradorDeRol, type Roles as EstadoDeRoles } from "../../../negocio/usuarios";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { ListaDeRoles } from "./ListaDeRoles";
import { RolEnEdicion } from "./RolEnEdicion";
import css from "./Roles.module.css";

// Roles (RF-75): cada rol es un nombre y un grupo de permisos. La misma pantalla en el celular y en
// la computadora. Asignar un rol a una persona se hace en la pestaña Usuarios (decisión 88).
// `cabeza`: en el celular, el título y las pestañas de Usuarios en lugar del título «Roles» (decisión 88).
export function Roles({ cabeza }: { cabeza?: ReactNode } = {}) {
  const x = useRoles();
  const [borrador, setBorrador] = useState<BorradorDeRol | null>(null);
  return (
    <main id="contenido" className="rl" data-testid="roles" tabIndex={-1}>
      {cabeza ? <div className="encabezado">{cabeza}</div> : <h1>Roles</h1>}
      <p className={css.bajada}>Un rol es un grupo de permisos con un nombre. Armá los que necesite el negocio y después asignáselos a cada persona en la pestaña Usuarios; una persona puede tener más de uno.</p>
      <Avisos x={x} />
      {borrador ? <RolEnEdicion key={borrador.id ?? "nuevo"} x={x} borrador={borrador} alCambiar={setBorrador} /> : <RolNuevo listo={Boolean(x.roles)} alTocar={() => setBorrador({ id: null, nombre: "", permisos: new Set() })} />}
      {!x.roles && !x.error && <p className={css.bajada} aria-busy="true">Buscando los roles…</p>}
      {x.roles && <ListaDeRoles x={x} alCambiar={(r) => { setBorrador({ id: r.id, nombre: r.nombre, permisos: new Set(r.permisos) }); window.scrollTo(0, 0); }} alBorrar={(r) => void x.borrar(r, () => setBorrador(null))} />}
    </main>
  );
}

function RolNuevo({ listo, alTocar }: { listo: boolean; alTocar: () => void }) {
  return <AlLadoDeLasPestanas><button type="button" className={`${css.boton} fuerte ${css.nuevo}`} disabled={!listo} onClick={alTocar} data-testid="rol-nuevo"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>Rol nuevo</button></AlLadoDeLasPestanas>;
}

function Avisos({ x }: { x: EstadoDeRoles }) {
  return (
    <>
      {x.error && <p className={css.error} role="alert">{x.error} <button type="button" className={css.boton} onClick={() => void x.cargar()}>Reintentar</button></p>}
      {x.aviso && <p className={css.aviso} role="status" data-testid="mensaje-roles">{x.aviso}</p>}
    </>
  );
}
