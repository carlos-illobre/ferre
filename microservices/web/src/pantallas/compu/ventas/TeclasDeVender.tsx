import { Atajo } from "../base/ui";
import css from "./TeclasDeVender.module.css";

// Las teclas que no están en ningún botón, con el aspecto de la v2.
export function TeclasDeVender() {
  return (
    <p className={`${css.teclas} detalle`} data-testid="teclas">
      <span><Atajo accion="lista.elegir" kbd /> agrega</span><span><Atajo accion="filas.anterior" kbd /><Atajo accion="filas.siguiente" kbd /> eligen el renglón</span>
      <span><Atajo accion="vender.renglon.sumar" kbd /><Atajo accion="vender.renglon.restar" kbd /> cantidad</span><span><Atajo accion="vender.renglon.quitar" kbd /> quita</span><span><Atajo accion="vender.panel" kbd /> panel</span>
    </p>
  );
}
