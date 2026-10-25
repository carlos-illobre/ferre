import { AlLadoDeLasPestanas } from "../../AlLadoDeLasPestanas";
import { usePuede } from "../../permisos";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import { irA } from "../base/rutas";
import css from "./Anomalias.module.css";

// Al lado de las pestañas, para quien puede verlo: «Ver en Quién hizo qué».
export function VerEnQuienHizoQue() {
  const puedeEsto = usePuede();
  if (!puedeEsto("negocio.actividad")) return null;
  return <AlLadoDeLasPestanas><button type="button" className={`mv-btn chico ${css.quien} mv2`} onClick={() => irA("actividad")} data-testid="ver-en-quien-hizo-que"><Icono nombre="historia" tam={16} />{TEXTOS.anomaliasV2.verEnQuienHizoQue.largo}</button></AlLadoDeLasPestanas>;
}
