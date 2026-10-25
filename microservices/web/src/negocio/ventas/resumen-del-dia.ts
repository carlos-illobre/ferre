import { confirmadas, hoyLocal, useVentasDelDia, type VentaDelDia } from "./ventas-del-dia";
import { MEDIOS, type Medio } from "./medios";

// «Hoy» renovada (specs/017): lo que se calcula de las ventas de un día, una sola vez para el
// celular y la computadora. Las anuladas no suman en nada.

export type ResumenDelDia = {
  total: number;
  medios: Record<Medio, { total: number; cuantas: number }>;
  ventas: number;
  productos: number; // renglones de las ventas confirmadas: un producto por kilo es uno (017, supuestos)
  ticket: number | null; // el total dividido las ventas, sin centavos; sin ventas, ninguno
};
export function resumenDelDia(ventas: VentaDelDia[]): ResumenDelDia {
  const medios = Object.fromEntries(MEDIOS.map((m) => [m, { total: 0, cuantas: 0 }])) as ResumenDelDia["medios"];
  let total = 0, productos = 0;
  const validas = confirmadas(ventas);
  for (const v of validas) {
    const importe = Number(v.total);
    total += importe;
    productos += v.items.length;
    const m = medios[v.medio_pago as Medio];
    if (m) { m.total += importe; m.cuantas += 1; }
  }
  return { total, medios, ventas: validas.length, productos, ticket: validas.length ? Math.round(total / validas.length) : null };
}

// Minutos desde la medianoche del dispositivo (el local está en un solo huso).
const minutoDelDia = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };

// Lo vendido por hora entera, desde la primera hora con ventas hasta la última (o hasta `hasta`,
// la hora actual si se mira hoy). Las horas sin ventas en el medio, en cero.
export function porHora(ventas: VentaDelDia[], hasta: number | null = null): { hora: number; total: number }[] {
  const validas = confirmadas(ventas);
  const horas = validas.map((v) => new Date(v.fecha).getHours());
  if (hasta !== null) horas.push(hasta);
  if (horas.length === 0) return [];
  const desde = Math.min(...horas), ultima = Math.max(...horas);
  const barras = Array.from({ length: ultima - desde + 1 }, (_, i) => ({ hora: desde + i, total: 0 }));
  for (const v of validas) barras[new Date(v.fecha).getHours() - desde]!.total += Number(v.total);
  return barras;
}

// El total de las ventas confirmadas hasta una hora del día (en minutos); sin hora, el día entero.
export function totalHasta(ventas: VentaDelDia[], minuto: number | null): number {
  return confirmadas(ventas).filter((v) => minuto === null || minutoDelDia(v.fecha) <= minuto).reduce((s, v) => s + Number(v.total), 0);
}

// Hoy contra ayer hasta la misma hora; otro día, entero contra el suyo (decisión 111).
export type Comparacion = { sinVentas: true } | { sinVentas: false; porcentaje: number; anterior: number };
export function comparar(actual: number, anterior: number): Comparacion {
  if (anterior <= 0) return { sinVentas: true };
  return { sinVentas: false, porcentaje: Math.round(((actual - anterior) / anterior) * 100), anterior };
}

const comoFecha = (dia: string) => new Date(`${dia}T12:00:00`);
const aDia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const diaAnterior = (dia: string): string => { const d = comoFecha(dia); d.setDate(d.getDate() - 1); return aDia(d); };
// «viernes 17/10»
export function nombreDelDia(dia: string): string {
  const d = comoFecha(dia);
  return `${d.toLocaleDateString("es-AR", { weekday: "long" })} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Lo del día anterior: el total hasta la misma hora (para comparar) y lo de cada hora (la raya
// punteada de la v2).
function delDiaAnterior(ventas: VentaDelDia[] | undefined, total: number | null, minuto: number | null) {
  return {
    comparacion: total !== null && ventas ? comparar(total, totalHasta(ventas, minuto)) : null,
    anteriorPorHora: new Map((ventas ? porHora(ventas) : []).map((b) => [b.hora, b.total])),
  };
}

// Lo del día que se mira: el resumen, las barras hasta la hora actual (hoy) y la lista, de la más
// reciente a la más vieja.
function delDia(ventas: VentaDelDia[] | null, horaActual: number | null) {
  if (!ventas) return { resumen: null, barras: [], lista: null };
  return { resumen: resumenDelDia(ventas), barras: porHora(ventas, horaActual), lista: [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)) };
}

// Todo lo de «Hoy» para un día (sin día, hoy): sus ventas, el resumen, las barras y la
// comparación con el día anterior. La comparación espera a tener los dos días.
// Hoy, se mira hasta la hora actual; otro día, el día entero.
const hasta = (esHoy: boolean, ahora: Date) => (esHoy ? { hora: ahora.getHours(), minuto: ahora.getHours() * 60 + ahora.getMinutes() } : { hora: null, minuto: null });
const ventasDe = (c: { datos?: { ventas: VentaDelDia[] } | null }) => c.datos?.ventas ?? null;

export function useResumenDelDia(dia: string | null, ahora: Date = new Date()) {
  const elegido = dia && dia !== hoyLocal() ? dia : null;
  const esHoy = elegido === null;
  const elDia = elegido ?? hoyLocal();
  const consulta = useVentasDelDia(elegido);
  const anterior = useVentasDelDia(diaAnterior(elDia));
  const h = hasta(esHoy, ahora);
  const d = delDia(ventasDe(consulta), h.hora);
  const a = delDiaAnterior(ventasDe(anterior) ?? undefined, d.resumen ? d.resumen.total : null, h.minuto);
  return { esHoy, dia: elDia, diaAnterior: diaAnterior(elDia), ventas: d.lista, resumen: d.resumen, barras: d.barras, ...a, error: consulta.error, cargando: consulta.cargando };
}
