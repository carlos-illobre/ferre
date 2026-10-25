import type { KeyboardEvent, RefObject } from "react";
import { Icono } from "../base/ui";
import { resumenDelAcceso, rolesEnElRenglon, rolesEnOrden, type Acceso, type UsuarioFila } from "../../../negocio/usuarios";
import { Iniciales } from "../../iconos-de-negocio";
import { RolDeLaFicha } from "./RolesDeLaFicha";
import type { UsuariosDeLaCompu } from "./useUsuariosDeLaCompu";
import css from "./Usuarios.module.css";

// Una persona por renglón: sus iniciales, nombre y correo, los roles que entran y su acceso.
export function TablaDeUsuarios({ x, lista, alMoverse }: { x: UsuariosDeLaCompu; lista: RefObject<HTMLDivElement>; alMoverse: (e: KeyboardEvent) => void }) {
  return (
    <div className={css.tabla} data-testid="usuarios" ref={lista} onKeyDown={alMoverse}>
      <div className={css.cab} aria-hidden="true" data-testid="cabeza-de-usuarios"><span /><span>Persona</span><span>Roles</span><span>Acceso</span><span /></div>
      {x.visibles.map((u) => <FilaDeUsuario key={u.id} u={u} esVos={u.id === x.yo} elegida={u.id === x.elegida?.id} acceso={x.accesoDeLaFila(u)} alElegir={() => x.elegir(u.id)} />)}
    </div>
  );
}

function FilaDeUsuario({ u, esVos, elegida, acceso, alElegir }: { u: UsuarioFila; esVos: boolean; elegida: boolean; acceso: Acceso; alElegir: () => void }) {
  return (
    <button type="button" data-id={u.id} className={`${css.fila} ${elegida ? "elegida" : ""} ${u.activo ? "" : "inactiva"}`} aria-pressed={elegida} onClick={alElegir} data-testid="usuario-fila">
      <Iniciales nombre={u.nombre} clave={u.email} apagado={!u.activo} />
      <span className={css.quien}><span className={css.nom} data-testid="nombre-de-usuario">{u.nombre}{esVos && <span className={css.yo}>Vos</span>}</span><span className={css.mail}>{u.email}</span></span>
      <RolesDelRenglon u={u} />
      <span className={css.acc}><AccesoDelRenglon u={u} acceso={acceso} /></span>
      <Icono nombre="chevron-right" className={css.chev} />
    </button>
  );
}

function RolesDelRenglon({ u }: { u: UsuarioFila }) {
  const roles = rolesEnOrden(u.roles);
  const entran = rolesEnElRenglon(roles);
  return (
    <span className={css.roles}>
      {roles.slice(0, entran).map((r) => <RolDeLaFicha key={r.id} nombre={r.nombre} />)}
      {roles.length > entran && <span className={`${css.rol} mas`}>+{roles.length - entran}</span>}
      {roles.length === 0 && <span className={css.gris}>Sin roles</span>}
    </span>
  );
}

function AccesoDelRenglon({ u, acceso }: { u: UsuarioFila; acceso: Acceso }) {
  if (!u.activo) return <span className={`${css.pastilla} contorno`}>Inactivo</span>;
  if (acceso.sesiones.length + acceso.celulares.length === 0) return <span className={css.gris} aria-label="Sin sesiones ni celulares">—</span>;
  return <span aria-label={resumenDelAcceso(acceso) ?? ""}><Icono nombre="monitor" tam={16} />{acceso.sesiones.length} · <Icono nombre="fingerprint" tam={16} />{acceso.celulares.length}</span>;
}
