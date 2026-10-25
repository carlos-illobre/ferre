import type { ReactNode } from "react";
import { Icono, type NombreDeIcono } from "../../../ui/iconos";
import css from "./Configuracion.module.css";

type Props = { icono: NombreDeIcono; titulo: string; id: string; detalle: string; encendida: boolean; alCambiar: () => void; testId: string; children?: ReactNode };

// Una preferencia: su baldosa, qué es y qué hace, y su llave.
export function RenglonDeAjusteCelu({ icono, titulo, id, detalle, encendida, alCambiar, testId, children }: Props) {
  return (
    <div className={css.renglon}>
      <span className={css.baldosa}><Icono nombre={icono} /></span>
      <div className={css.texto}><b id={id}>{titulo}</b><p className="mv-detalle" id={`${id}-detalle`}>{detalle}</p></div>
      <button type="button" role="switch" aria-checked={encendida} aria-labelledby={id} aria-describedby={`${id}-detalle`} className={`${css.llave} ${encendida ? "si" : ""}`} onClick={alCambiar} data-testid={testId} />
      {children && <div className={css.extra}>{children}</div>}
    </div>
  );
}
