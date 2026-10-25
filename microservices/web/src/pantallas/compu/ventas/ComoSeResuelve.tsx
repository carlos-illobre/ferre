import { COBROS_DE_DIFERENCIA, type Corrigiendo } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { MediosChicos } from "./MediosChicos";
import css from "./VentasDelDia.module.css";

// Cómo se resuelve la diferencia: se cobra (con qué), se devuelve en efectivo, cambia la deuda o no hay.
const t = TEXTOS.hoy;

export function ComoSeResuelve({ k }: { k: Corrigiendo }) {
  return <div className={css.resuelve} data-testid="como-se-resuelve"><Resolucion k={k} /></div>;
}

function Resolucion({ k }: { k: Corrigiendo }) {
  const d = k.diferencia;
  if (k.resuelta === "cobrada") {
    return <><span>{t.seCobraCon.largo}</span><span className={css.mediosEd} role="radiogroup" aria-label="Con qué se cobra la diferencia"><MediosChicos medios={COBROS_DE_DIFERENCIA} elegido={k.medioDif} alElegir={k.setMedioDif} prefijo="dif" /></span></>;
  }
  if (k.resuelta === "devuelta") return <span>{t.seDevuelve.largo}: <b>{pesosCortos(-d)}</b></span>;
  if (k.resuelta === "cuenta_corriente" && d !== 0) return <span>{d > 0 ? t.subeLaDeuda.largo : t.bajaLaDeuda.largo}{k.cliente ? ` ${k.cliente.nombre}` : ""}: <b>{pesosCortos(Math.abs(d))}</b></span>;
  return <span>{t.sinDiferencia.largo}</span>;
}
