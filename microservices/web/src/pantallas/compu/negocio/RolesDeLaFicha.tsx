import { TEXTOS } from "../../textos";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Atajo, Icono } from "../base/ui";
import { loQuePermiten, type CambioDeRoles, type UsuarioFila } from "../../../negocio/usuarios";
import { ElegirYGuardarRoles, type RolAsignable } from "../../RolesDeUsuario";
import { iconoDeRol } from "../../iconos-de-negocio";
import css from "./Usuarios.module.css";

// Un rol, con su ícono; el Administrador, resaltado.
export const RolDeLaFicha = ({ nombre }: { nombre: string }) => (
  <span className={`${css.rol} ${nombre === "Administrador" ? "admin" : ""}`}><Icono nombre={iconoDeRol(nombre)} tam={16} />{nombre}</span>
);

function RolesQueTiene({ roles, descripcion }: { roles: { id: string; nombre: string }[]; descripcion: string }) {
  return (
    <>
      <div className={`${css.roles} ${css.rolesFicha}`}>{roles.length ? roles.map((r) => <RolDeLaFicha key={r.id} nombre={r.nombre} />) : <span className={css.gris}>Sin roles</span>}</div>
      {descripcion && <p className={css.puede}>{descripcion}</p>}
    </>
  );
}

// Sus roles con lo que permiten en palabras y «Cambiar», que abre la elección de roles.
export function RolesDeLaFicha({ u, disponibles, enLinea, ocupada, cambio: c }: { u: UsuarioFila; disponibles: RolAsignable[]; enLinea: boolean; ocupada: boolean; cambio: CambioDeRoles }) {
  const roles = u.roles ?? [];
  const descripcion = loQuePermiten(roles, disponibles);
  const tecla = useEtiqueta("usuarios.cambiar-roles");
  return (
    <div data-testid="roles-de-usuario">
      <h3>{TEXTOS.usuarios.roles.largo}{!c.cambiando && <button type="button" className={`${css.boton} suave`} disabled={ocupada || !enLinea} onClick={c.abrir} aria-keyshortcuts={tecla} aria-label={`Cambiar los roles de ${u.nombre}`} data-testid="cambiar-roles"><Icono nombre="pencil" tam={16} />Cambiar <Atajo accion="usuarios.cambiar-roles" className={css.kbd} /></button>}</h3>
      {c.cambiando ? <ElegirYGuardarRoles nombre={u.nombre} disponibles={disponibles} cambio={c} /> : <RolesQueTiene roles={roles} descripcion={descripcion} />}
    </div>
  );
}
