import type { Consulta } from "@servidor/ventas";
import { comparar, resumenDelDia, totalHasta, type Comparacion } from "./resumen-del-dia";
import { confirmadas, type VentaDelDia, type VentasDelDia } from "./ventas-del-dia";
import { MEDIOS, NOMBRE_DE_MEDIO } from "./venta";
import { pesos } from "../../formato";

// El tablero de «Cómo va el negocio» como la v2 (021, decisión 148), igual en el celular y en la
// computadora. Cada número de arriba se compara con el día anterior hasta la misma hora, como en
// «Ventas del día» (decisión 111): lo vendido, la cantidad de ventas y el ticket promedio.
export type Comparado = { comparacion: Comparacion; anterior: number };
export type ComparacionDelTablero = { vendido: Comparado; ventas: Comparado; ticket: Comparado | null };

const minutoDelDia = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };

// `minuto`: hasta qué minuto del día anterior se cuenta (el de ahora si se mira hoy; sin minuto, el día entero).
export function compararConElAnterior(hoy: VentaDelDia[], anterior: VentaDelDia[], minuto: number | null): ComparacionDelTablero {
  const r = resumenDelDia(hoy);
  const antes = confirmadas(anterior).filter((v) => minuto === null || minutoDelDia(v.fecha) <= minuto);
  const vendidoAntes = totalHasta(anterior, minuto);
  const ticketAntes = antes.length ? Math.round(vendidoAntes / antes.length) : 0;
  return {
    vendido: { comparacion: comparar(r.total, vendidoAntes), anterior: vendidoAntes },
    ventas: { comparacion: comparar(r.ventas, antes.length), anterior: antes.length },
    ticket: r.ticket === null ? null : { comparacion: comparar(r.ticket, ticketAntes), anterior: ticketAntes },
  };
}

// Lo que preguntaron y no llevaron, agrupado por lo que se pidió («Disco de corte × 3»): primero lo
// más pedido y, entre iguales, lo último que se pidió. Se agrupa sin mayúsculas ni acentos.
export type NoLlevado = { descripcion: string; veces: number; consultas: Consulta[] };
const clave = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export function agruparNoLlevados(consultas: Consulta[]): NoLlevado[] {
  const grupos = new Map<string, NoLlevado>();
  for (const c of consultas) {
    const k = clave(c.descripcion);
    const grupo = grupos.get(k);
    if (grupo) { grupo.veces += 1; grupo.consultas.push(c); } else grupos.set(k, { descripcion: c.descripcion, veces: 1, consultas: [c] });
  }
  const ultima = (g: NoLlevado) => Math.max(...g.consultas.map((c) => new Date(c.fecha).getTime()));
  return [...grupos.values()].sort((a, b) => b.veces - a.veces || ultima(b) - ultima(a));
}

// «De dónde sale» lo vendido hoy: cada medio con lo suyo, las anuladas que no suman y el total.
export function pasosDeLoVendido(d: VentasDelDia): string[] {
  const anuladas = d.ventas.length - confirmadas(d.ventas).length;
  const pasos = MEDIOS.filter((m) => (d.totales[m] ?? 0) > 0).map((m) => `${NOMBRE_DE_MEDIO[m]}: ${pesos(d.totales[m])}`);
  if (anuladas) pasos.push(`${anuladas} ${anuladas === 1 ? "venta anulada" : "ventas anuladas"}: no ${anuladas === 1 ? "suma" : "suman"}`);
  if (!pasos.length) pasos.push("Todavía no se registraron ventas en el día");
  return [...pasos, `Vendido hoy: ${pesos(d.total)}`];
}
