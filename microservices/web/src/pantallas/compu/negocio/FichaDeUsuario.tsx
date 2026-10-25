import { useEffect, useRef } from "react";
import { TEXTOS } from "../../textos";
import { fecha } from "../../../negocio/formato";
import { Aviso, Icono } from "../base/ui";
import { useCambioDeRoles, type Acceso, type CelularDeOtroFila, type SesionFila, type UsuarioFila } from "../../../negocio/usuarios";
import type { RolAsignable } from "../../RolesDeUsuario";
import { Iniciales } from "../../iconos-de-negocio";
import { irA } from "../base/rutas";
import { AccesoDeLaFicha } from "./AccesoDeLaFicha";
import { RolesDeLaFicha } from "./RolesDeLaFicha";
import css from "./Usuarios.module.css";

type Props = {
  u: UsuarioFila; yo: string | null; acceso: Acceso; disponibles: RolAsignable[]; enLinea: boolean; ocupada: boolean; error: string | null; cambiandoRoles: number;
  alGuardarRoles: (ids: string[]) => Promise<string | null>; alActivar: () => void; alCerrarSesion: (s: SesionFila) => void; alQuitarCelular: (c: CelularDeOtroFila) => void;
};

// La ficha de la persona elegida, fija a la derecha: quién es y desde cuándo, sus roles con lo que
// permiten en palabras («Cambiar», R), sus sesiones con «Cerrar», sus celulares con huella con
// «Quitar» y, abajo, «Desactivar» o «Reactivar» y «Todo lo que hizo».
export function FichaDeUsuario({ u, yo, acceso, disponibles, enLinea, ocupada, error, cambiandoRoles, alGuardarRoles, alActivar, alCerrarSesion, alQuitarCelular }: Props) {
  const cambio = useCambioDeRoles(u.roles ?? [], alGuardarRoles, TEXTOS.usuarios.faltaUnRol.largo);
  // La tecla R pide cambiar los roles: cada vez que sube la cuenta, se abre la elección.
  const primera = useRef(cambiandoRoles);
  useEffect(() => { if (cambiandoRoles !== primera.current && enLinea) cambio.abrir(); }, [cambiandoRoles]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <aside className={css.ficha} aria-label={`Ficha de ${u.nombre}`} data-testid="ficha-usuario">
      <QuienEs u={u} esVos={u.id === yo} />
      <div className={css.sep} />
      <RolesDeLaFicha u={u} disponibles={disponibles} enLinea={enLinea} ocupada={ocupada} cambio={cambio} />
      <div className={css.sep} />
      <AccesoDeLaFicha nombre={u.nombre} acceso={acceso} enLinea={enLinea} alCerrarSesion={alCerrarSesion} alQuitarCelular={alQuitarCelular} />
      {error && <Aviso tipo="error">{error}</Aviso>}
      <PieDeLaFicha u={u} esVos={u.id === yo} enLinea={enLinea} ocupada={ocupada} alActivar={alActivar} />
    </aside>
  );
}

function QuienEs({ u, esVos }: { u: UsuarioFila; esVos: boolean }) {
  return (
    <div className={css.fichaQuien}>
      <Iniciales nombre={u.nombre} clave={u.email} tam="l" apagado={!u.activo} />
      <div className={css.fichaTextos}><div className={css.fichaNombre}>{u.nombre}{esVos && <span className={css.yo}>Vos</span>}</div><div className={`${css.detalle} ${css.cortar}`}>{u.email}</div><div className={css.detalle}>Desde el {fecha(u.creado_en.slice(0, 10))}{u.activo ? "" : " · desactivado"}</div></div>
    </div>
  );
}

// «Desactivar» o «Reactivar» (a uno mismo lo desactiva otra persona) y «Todo lo que hizo».
function PieDeLaFicha({ u, esVos, enLinea, ocupada, alActivar }: { u: UsuarioFila; esVos: boolean; enLinea: boolean; ocupada: boolean; alActivar: () => void }) {
  const accion = u.activo ? "Desactivar" : "Reactivar";
  return (
    <div className={css.pie}>
      {esVos ? <span className={`${css.detalle} ${css.crece}`}>A vos te desactiva otra persona</span> : (
        <button type="button" className={`${css.boton} ${u.activo ? "peligro" : "suave"} ${css.crece}`} disabled={ocupada || !enLinea} onClick={alActivar} aria-label={`${accion} a ${u.nombre}`}>
          <Icono nombre={u.activo ? "user-x" : "user-check"} tam={16} />{ocupada ? "Guardando…" : accion}
        </button>
      )}
      <button type="button" className={`${css.boton} fantasma`} onClick={() => irA("actividad")}>Todo lo que hizo</button>
    </div>
  );
}
