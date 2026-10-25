import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Usuarios.module.css";

// El botón para autorizar a alguien, arriba de la lista, con su flecha (decisión 102).
export function AutorizarOtro({ alTocar }: { alTocar: () => void }) {
  return (
    <button type="button" className={css.alta} onClick={alTocar} data-testid="autorizar">
      <span className={css.mas} aria-hidden="true"><Icono nombre="user-plus" /></span>
      <span><strong>{TEXTOS.usuarios.autorizarOtro.corto}</strong><small>{TEXTOS.usuarios.invitarAlguien.corto}</small></span>
      <span className={css.altaFlecha} aria-hidden="true"><Icono nombre="chevron-right" /></span>
    </button>
  );
}
