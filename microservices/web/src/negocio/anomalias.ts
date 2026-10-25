import { productoEnMemoria } from "./catalogo";
import { conUnidad } from "./catalogo";
import { useDelServidor } from "./del-servidor";
import type { Anomalia, PaginaDeAnomalias } from "@servidor/anomalias";

// Anomalías anotadas (RF-59): el registro, de la más nueva a la más vieja, de a una página. Igual en
// el celular y en la computadora. Además, como la v2 (specs/021): lo de esta semana agrupado por
// producto, para saber qué ir a contar. La semana se calcula solo si la primera página la cubre
// entera: si no, no se sabe y queda `null` (no se inventa un número).
export type { Anomalia, PaginaDeAnomalias };
export function useAnomalias(pagina: number) {
  return useDelServidor<PaginaDeAnomalias>(["anomalias", pagina], `/anomalias?pagina=${pagina}`, { mantenerAnterior: true });
}

export const TITULOS_DE_ANOMALIA: Record<string, string> = { venta_sin_stock: "Venta sin stock" };
const SEMANA = 7 * 24 * 60 * 60 * 1000;

export type ProductoConAnomalias = { producto_id: string; producto: string; foto_url: string | null; veces: number; ultima: string; falto: string; uno: boolean };
export type LaSemana = { cuantas: number; falto: string; productos: ProductoConAnomalias[]; laQueMas: string | null };

// Lo que faltó, sumado por unidad: «14 un. + 0,3 kg».
function sumarPorUnidad(lista: Anomalia[]): { texto: string; uno: boolean } {
  const porUnidad = new Map<string, number>();
  for (const a of lista) porUnidad.set(a.unidad ?? "unidad", (porUnidad.get(a.unidad ?? "unidad") ?? 0) + Number(a.cantidad));
  const partes = [...porUnidad].map(([u, n]) => conUnidad(Math.round(n * 1000) / 1000, u));
  return { texto: partes.join(" + "), uno: porUnidad.size === 1 && [...porUnidad.values()][0] === 1 };
}

// La primera página cubre la semana si no hay más, o si la última que trae es de antes.
function cubre(datos: PaginaDeAnomalias, desde: number): boolean {
  const ultima = datos.anomalias[datos.anomalias.length - 1];
  return !datos.hay_mas || (ultima !== undefined && new Date(ultima.creado_en).getTime() < desde);
}

// Por producto, el que más veces primero (y entre iguales, el más reciente).
function porProducto(lista: Anomalia[]): ProductoConAnomalias[] {
  const grupos = new Map<string, Anomalia[]>();
  for (const a of lista) { const clave = a.producto_id ?? a.producto; grupos.set(clave, [...(grupos.get(clave) ?? []), a]); }
  return [...grupos.values()].map((g) => {
    const s = sumarPorUnidad(g);
    return { producto_id: g[0]!.producto_id ?? g[0]!.producto, producto: g[0]!.producto, foto_url: productoEnMemoria(g[0]!.producto_id)?.foto_url ?? null, veces: g.length, ultima: g[0]!.creado_en, falto: s.texto, uno: s.uno };
  }).sort((a, b) => b.veces - a.veces || b.ultima.localeCompare(a.ultima));
}

export function laSemana(datos: PaginaDeAnomalias | null, ahora = Date.now()): LaSemana | null {
  const desde = ahora - SEMANA;
  if (!datos || datos.pagina !== 1 || !cubre(datos, desde)) return null;
  const deLaSemana = datos.anomalias.filter((a) => new Date(a.creado_en).getTime() >= desde);
  const productos = porProducto(deLaSemana);
  const masVeces = productos[0];
  return { cuantas: deLaSemana.length, falto: sumarPorUnidad(deLaSemana).texto, productos, laQueMas: masVeces && masVeces.veces > 1 ? masVeces.producto : null };
}

// El registro agrupado por día: «Hoy, sábado 24», «Ayer, viernes 23», «Jueves 22».
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
export function nombreDelDiaDe(iso: string, ahora = new Date()): string {
  const d = new Date(iso);
  const ayer = new Date(ahora); ayer.setDate(ahora.getDate() - 1);
  const dia = `${DIAS[d.getDay()]} ${d.getDate()}`;
  if (d.toDateString() === ahora.toDateString()) return `Hoy, ${dia}`;
  if (d.toDateString() === ayer.toDateString()) return `Ayer, ${dia}`;
  const lejos = ahora.getTime() - d.getTime() > 300 * 24 * 60 * 60 * 1000 || d.getFullYear() !== ahora.getFullYear();
  return `${dia.charAt(0).toUpperCase()}${dia.slice(1)}${lejos ? `/${d.getMonth() + 1}/${d.getFullYear()}` : `/${d.getMonth() + 1}`}`;
}
export function porDia(lista: Anomalia[]): { dia: string; anomalias: Anomalia[] }[] {
  const dias: { dia: string; anomalias: Anomalia[] }[] = [];
  for (const a of lista) {
    const dia = nombreDelDiaDe(a.creado_en);
    if (dias[dias.length - 1]?.dia !== dia) dias.push({ dia, anomalias: [] });
    dias[dias.length - 1]!.anomalias.push(a);
  }
  return dias;
}
const dosCifras = (n: number) => String(n).padStart(2, "0");
export const horaDe = (iso: string) => { const d = new Date(iso); return `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`; };
// «ayer 17:20», «hoy 10:31», «jueves 15 12:40».
export function ultimaVez(iso: string): string {
  const dia = nombreDelDiaDe(iso).split(",")[0]!;
  return `${dia.charAt(0).toLowerCase()}${dia.slice(1)} ${horaDe(iso)}`;
}

// Sin conexión, el error lo dice la pantalla; si contestó el servidor, su mensaje.
export const errorDeAnomalias = (error: unknown, sinConexion: string) => ((error as { estado?: number }).estado ? (error as Error).message : sinConexion);
export const cuantasAnomalias = (n: number) => (n === 1 ? "1 anomalía" : `${n} anomalías`);
export const cuantasVeces = (n: number) => (n === 1 ? "1 vez" : `${n} veces`);
