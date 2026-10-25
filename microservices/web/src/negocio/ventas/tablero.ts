import type { Consulta } from "@servidor/ventas";
import { comparar, porHora, resumenDelDia, totalHasta, type Comparacion } from "./resumen-del-dia";
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

// Lo vendido por hora para el gráfico: siempre de 8 a 19, y más si hubo ventas antes o después;
// cuánto se vendió hoy y ayer en cada hora, la hora más alta de hoy y el escalón del eje (redondo,
// de modo que tres escalones cubran el máximo: 60 mil para 63.000).
export function graficoPorHora(hoy: VentaDelDia[] | null, ayer: VentaDelDia[] | null, ahora: number) {
  const hoyH = new Map((hoy ? porHora(hoy, ahora) : []).map((b) => [b.hora, b.total]));
  const ayerH = new Map((ayer ? porHora(ayer) : []).map((b) => [b.hora, b.total]));
  const de = (m: Map<number, number>, h: number) => m.get(h) ?? 0;
  const conVentas = [...hoyH.keys(), ...ayerH.keys()].filter((h) => de(hoyH, h) > 0 || de(ayerH, h) > 0);
  const desde = Math.min(8, ...conVentas), hasta = Math.max(19, ...conVentas);
  const horas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i).map((h) => ({ hora: h, hoy: de(hoyH, h), ayer: de(ayerH, h) }));
  const max = Math.max(0, ...horas.map((h) => Math.max(h.hoy, h.ayer)));
  const pico = horas.reduce<{ hora: number; hoy: number } | null>((m, h) => (h.hoy > 0 && (m === null || h.hoy > m.hoy) ? h : m), null)?.hora ?? null;
  return { horas, paso: escalon(max), pico };
}

function escalon(max: number): number {
  if (max <= 0) return 10_000;
  const crudo = max / 3;
  const base = 10 ** Math.floor(Math.log10(crudo));
  return [1, 2, 2.5, 5, 10].map((m) => m * base).find((v) => v * 3 >= max) ?? base * 10;
}

const esDeHoy = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
// Cuántas consultas de «No llevó» son de hoy: la pastilla de la tarjeta.
export const consultasDeHoy = (consultas: Consulta[] | null | undefined) => (consultas ?? []).filter((c) => esDeHoy(c.fecha)).length;
// Cuándo fue una consulta: la hora si es de hoy, si no la fecha.
export const cuandoFueLaConsulta = (iso: string, fecha: (dia: string) => string) =>
  esDeHoy(iso) ? new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }) : fecha(iso);

// Las barras de las horas de hoy en el celular: de 8 (o antes, si se vendió antes) hasta las 19 o la
// hora actual; cada barra con su alto (de 3 a 40 px), si quedó vacía y si es la hora actual.
export function barrasDeHoy(hoy: VentaDelDia[] | null, hora: number) {
  const horas = hoy ? porHora(hoy, hora) : [];
  const porH = new Map(horas.map((b) => [b.hora, b.total]));
  const desde = Math.min(8, ...horas.filter((b) => b.total > 0).map((b) => b.hora)), hasta = Math.max(19, hora);
  const columnas = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
  const max = Math.max(1, ...columnas.map((h) => porH.get(h) ?? 0));
  const barras = columnas.map((h) => ({ hora: h, vacia: (porH.get(h) ?? 0) === 0, ahora: h === hora, alto: Math.max(3, ((porH.get(h) ?? 0) / max) * 40) }));
  return { barras, desde, medio: Math.round((desde + hasta) / 2), hasta };
}
