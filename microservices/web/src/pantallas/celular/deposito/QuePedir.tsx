import { irA } from "../rutas";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Stock.module.css";

// Abajo, al pulgar: «Qué pedir», que abre los pedidos.
const t = TEXTOS.stock;

export function QuePedir() {
  return (
    <div className={css.pedir}>
      <span className={css.pedirTxt}><b>— {t.paraPedir.corto}</b>{t.aProveedores.corto}</span>
      <button type="button" className={css.pedirBoton} onClick={() => irA("deposito/pedidos")} data-testid="que-pedir"><Icono nombre="truck" />{t.quePedir.corto}</button>
    </div>
  );
}
