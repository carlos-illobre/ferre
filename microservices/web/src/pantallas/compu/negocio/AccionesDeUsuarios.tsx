import { TEXTOS } from "../../textos";
import { Icono } from "../base/ui";
import { usePuede } from "../../permisos";
import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { irA } from "../base/rutas";
import css from "./Usuarios.module.css";

// Al lado de las pestañas: «Roles y permisos» (Alt R) y «Autorizar a alguien» (Alt N).
export function AccionesDeUsuarios({ enLinea, alAutorizar }: { enLinea: boolean; alAutorizar: () => void }) {
  const puedeEsto = usePuede();
  return (
    <AlLadoDeLasPestanas>
      {puedeEsto("admin.roles") && <button type="button" className={css.boton} onClick={() => irA("roles")} aria-keyshortcuts="Alt+R" data-testid="ir-a-roles"><Icono nombre="shield-check" tam={16} />Roles y permisos <span className={css.kbd}>Alt R</span></button>}
      <button type="button" className={`${css.boton} accion`} disabled={!enLinea} onClick={alAutorizar} aria-keyshortcuts="Alt+N" data-testid="autorizar"><Icono nombre="user-plus" tam={16} />{TEXTOS.usuarios.autorizarOtro.largo} <span className={css.kbd}>Alt N</span></button>
    </AlLadoDeLasPestanas>
  );
}
