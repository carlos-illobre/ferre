import { COBROS_DE_DIFERENCIA } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { MediosDePago } from "./MediosDePago";
import type { Cambio } from "./useCambio";
import css from "./VentasDelDia.module.css";

// La diferencia: a cobrar o a devolver; con cuenta corriente, si sube o baja la deuda; si se cobra, con qué.
const t = TEXTOS.hoy;

export function DiferenciaDelCambio({ k }: { k: Cambio }) {
  const d = k.diferencia;
  return (
    <div className={css.difer} data-testid="diferencia-cambio">
      <div><small>{d >= 0 ? t.aCobrar.corto : t.aDevolver.corto}</small><b className="importe">{k.vuelve.length ? pesosCortos(Math.abs(d)) : "—"}</b>
        {k.resuelto === "cuenta_corriente" && d !== 0 && <small>{d > 0 ? t.subeLaDeuda.corto : t.bajaLaDeuda.corto}</small>}</div>
      {k.resuelto === "cobrado" && <MediosDePago medios={COBROS_DE_DIFERENCIA} elegido={k.medioDif} alElegir={k.setMedioDif} etiqueta="Con qué se cobra la diferencia" prefijo="dif" />}
    </div>
  );
}
