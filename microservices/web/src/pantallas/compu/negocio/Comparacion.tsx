import type { Comparado } from "../../../negocio/ventas";
import { pesosCortos } from "../../../negocio/formato";
import { TEXTOS } from "../../textos";
import { Icono } from "../../../ui/iconos";
import css from "./Resumen.module.css";

// La comparación con ayer hasta la misma hora, como la v2: la pastilla con la flecha y el
// porcentaje (verde si sube, roja si baja, gris si queda igual) y la diferencia con lo de ayer.
type Props = { c: Comparado | null; actual: number; pesos?: boolean; extra?: string };
const tipoDe = (p: number) => (Math.abs(p) <= 1 ? "igual" : p > 0 ? "sube" : "baja");

export function Comparacion({ c, actual, pesos, extra }: Props) {
  if (!c) return <SinComparacion texto={extra ?? "Trayendo lo de ayer…"} />;
  if (c.comparacion.sinVentas) return <SinComparacion texto={extra ?? TEXTOS.hoy.ayerSinVentas.largo} />;
  const p = c.comparacion.porcentaje;
  const tipo = tipoDe(p);
  const texto = extra ?? diferencia(actual, c.anterior, pesos);
  return (
    <>
      <span className={`${css.delta} ${tipo}`}>{tipo !== "igual" && <Icono nombre={p > 0 ? "arrow-up-right" : "arrow-down-right"} tam={16} />}{Math.abs(p)} %</span>
      <span className={css.compTexto} title={texto}>{texto}</span>
    </>
  );
}

function diferencia(actual: number, anterior: number, pesos?: boolean) {
  const f = (n: number) => (pesos ? pesosCortos(n) : n.toLocaleString("es-AR"));
  const dif = actual - anterior;
  return `${dif >= 0 ? "+" : "−"}${f(Math.abs(dif))} · ayer: ${f(anterior)}`;
}

const SinComparacion = ({ texto }: { texto: string }) => <><span className={css.delta}>—</span><span className={css.compTexto}>{texto}</span></>;
