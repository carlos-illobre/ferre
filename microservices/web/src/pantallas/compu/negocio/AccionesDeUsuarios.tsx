import { TEXTOS } from "../../textos";
import { useEtiqueta } from "../../../plataforma/comandos";
import { Atajo, Icono } from "../base/ui";
import { usePuede } from "../../permisos";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { irA } from "../base/rutas";
import css from "./Usuarios.module.css";

// Al lado de las pestañas: «Roles y permisos» y «Autorizar a alguien».
export function AccionesDeUsuarios({ enLinea, alAutorizar }: { enLinea: boolean; alAutorizar: () => void }) {
  const puedeEsto = usePuede();
  const [teclaRoles, teclaAutorizar] = [useEtiqueta("usuarios.roles"), useEtiqueta("usuarios.autorizar")];
  return (
    <AlLadoDeLasPestanas>
      {puedeEsto("admin.roles") && <button type="button" className={css.boton} onClick={() => irA("roles")} aria-keyshortcuts={teclaRoles} data-testid="ir-a-roles"><Icono nombre="shield-check" tam={16} />Roles y permisos <Atajo accion="usuarios.roles" className={css.kbd} /></button>}
      <button type="button" className={`${css.boton} accion`} disabled={!enLinea} onClick={alAutorizar} aria-keyshortcuts={teclaAutorizar} data-testid="autorizar"><Icono nombre="user-plus" tam={16} />{TEXTOS.usuarios.autorizarOtro.largo} <Atajo accion="usuarios.autorizar" className={css.kbd} /></button>
    </AlLadoDeLasPestanas>
  );
}
