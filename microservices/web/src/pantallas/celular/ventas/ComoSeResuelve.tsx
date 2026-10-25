import { COBROS_DE_DIFERENCIA, type Corrigiendo } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { MediosDePago } from "./MediosDePago";
import css from "./VentasDelDia.module.css";

// Cómo se resuelve la diferencia: se cobra (con qué), se devuelve, cambia la deuda o no hay.
const t = TEXTOS.hoy;

export function ComoSeResuelve({ k }: { k: Corrigiendo }) {
  return <div className={css.resuelve} data-testid="como-se-resuelve"><Resolucion k={k} /></div>;
}

function Resolucion({ k }: { k: Corrigiendo }) {
  const d = k.diferencia;
  if (k.resuelta === "cobrada") return <><span>{t.seCobraCon.corto}</span><MediosDePago medios={COBROS_DE_DIFERENCIA} elegido={k.medioDif} alElegir={k.setMedioDif} etiqueta="Con qué se cobra la diferencia" prefijo="dif" /></>;
  if (k.resuelta === "devuelta") return <span>{t.seDevuelve.corto}: <b>{pesosCortos(-d)}</b></span>;
  if (k.resuelta === "cuenta_corriente" && d !== 0) return <span>{d > 0 ? t.subeLaDeuda.corto : t.bajaLaDeuda.corto}{k.cliente ? ` ${k.cliente.nombre}` : ""}: <b>{pesosCortos(Math.abs(d))}</b></span>;
  return <span>{t.sinDiferencia.corto}</span>;
}
