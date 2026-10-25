import { pesosCortos } from "../../../negocio/formato";
import type { Comparado } from "../../../negocio/ventas";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Resumen.module.css";

const enNumeros = (n: number, pesos?: boolean) => (pesos ? pesosCortos(n) : n.toLocaleString("es-AR"));
const flecha = (p: number) => <Icono nombre={p > 0 ? "arrow-up-right" : "arrow-down-right"} tam={16} />;
const masOMenos = (p: number) => (p > 0 ? "más" : "menos");

// El «$» chico de la v2, delante del importe.
export function Pesos({ valor }: { valor: number }) {
  const texto = pesosCortos(Math.abs(valor));
  const signo = valor < 0 ? "−" : "";
  return <span aria-label={`${signo}${texto}`}>{signo}<span className={css.peso} aria-hidden="true">$</span><span aria-hidden="true">{texto.slice(1)}</span></span>;
}

// La comparación de «Vendido hoy»: la pastilla con el porcentaje y la diferencia con ayer a esta hora.
export function Comparacion({ c, actual, pesos }: { c: Comparado | null; actual: number; pesos?: boolean }) {
  if (!c) return <span className={css.gris}>Trayendo lo de ayer…</span>;
  if (c.comparacion.sinVentas) return <span className={css.gris}>{TEXTOS.hoy.ayerSinVentas.corto}</span>;
  const p = c.comparacion.porcentaje;
  if (Math.abs(p) <= 1) return <><span className={`${css.delta} igual`}>{Math.abs(p)} %</span>igual que ayer</>;
  const dif = Math.abs(actual - c.anterior);
  return <><span className={`${css.delta} ${p > 0 ? "sube" : "baja"}`}>{flecha(p)}{Math.abs(p)} %</span>{`${enNumeros(dif, pesos)} ${masOMenos(p)} · ayer: ${enNumeros(c.anterior, pesos)}`}</>;
}

// La línea de abajo de un número chico: «↗ 3 más · antes 20», o «igual que ayer».
export function Diferencia({ c, actual, pesos }: { c: Comparado | null; actual: number; pesos?: boolean }) {
  if (!c || c.comparacion.sinVentas) return <span className={`${css.d} gris`}>{c ? TEXTOS.hoy.ayerSinVentas.corto : "…"}</span>;
  const p = c.comparacion.porcentaje;
  if (Math.abs(p) <= 1) return <span className={`${css.d} gris`}>igual que ayer</span>;
  const texto = pesos ? `${Math.abs(p)} % ${masOMenos(p)}` : `${enNumeros(Math.abs(actual - c.anterior))} ${masOMenos(p)} · antes ${enNumeros(c.anterior)}`;
  return <span className={`${css.d} ${p > 0 ? "" : "baja"}`}>{flecha(p)}{texto}</span>;
}
