import type { ReactNode } from "react";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import css from "./Configuracion.module.css";

type Props = { icono: NombreDeIcono; titulo: string; id: string; detalle: string; tecla?: string; encendida: boolean; alCambiar: () => void; testId: string; children?: ReactNode };

// Una preferencia: su baldosa, qué es y qué hace, su tecla y su llave.
export function RenglonDeAjuste({ icono, titulo, id, detalle, tecla, encendida, alCambiar, testId, children }: Props) {
  return (
    <div className={css.renglon}>
      <span className={css.baldosa}><Icono nombre={icono} /></span>
      <div className={css.texto}><b id={id}>{titulo}</b><p className="mv-detalle" id={`${id}-detalle`}>{detalle}</p></div>
      <div className={css.llaveCaja}>
        {tecla && <span className="mv-kbd">{tecla}</span>}
        <button type="button" role="switch" aria-checked={encendida} aria-labelledby={id} aria-describedby={`${id}-detalle`} aria-keyshortcuts={tecla?.replace(" ", "+")} className={`${css.llave} ${encendida ? "si" : ""}`} onClick={alCambiar} data-testid={testId} />
      </div>
      {children && <div className={css.extra}>{children}</div>}
    </div>
  );
}
