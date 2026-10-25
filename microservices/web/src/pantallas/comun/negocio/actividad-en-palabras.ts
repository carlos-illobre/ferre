import { hoyLocal } from "../../../formato";

// «Quién hizo qué» en palabras, igual en el celular y en la computadora (decisión 47; la v2,
// decisión 148): el nombre de cada acción con el ícono de su tipo, el detalle en una línea y
// cada dato con su nombre legible.
type Contenido = Record<string, unknown>;
export { CATEGORIAS, TIPOS, queFue, type Que } from "./que-fue";
export { detalleDe } from "./detalle-del-evento";

// El período del registro: hoy, ayer, esta semana o los días que se elijan (sin días, todo).
export type { Periodo } from "../../../negocio/actividad";
import type { Periodo } from "../../../negocio/actividad";
export const inicioDelDia = (d: string, corrimiento = 0) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() + corrimiento); return x.toISOString(); };
const dia = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const corrido = (iso: string, dias: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + dias); return dia(d); };

// Los días que cuenta cada período (el «hasta» incluye ese día). Esta semana empieza el lunes.
export function diasDelPeriodo(f: { periodo: Periodo; desde: string; hasta: string }, hoy = hoyLocal()): { desde: string; hasta: string } {
  if (f.periodo === "hoy") return { desde: hoy, hasta: hoy };
  if (f.periodo === "ayer") return { desde: corrido(hoy, -1), hasta: corrido(hoy, -1) };
  if (f.periodo === "semana") return { desde: corrido(hoy, -((new Date(`${hoy}T12:00:00`).getDay() + 6) % 7)), hasta: hoy };
  return { desde: f.desde, hasta: f.hasta };
}

// La hora de la acción: sola si es de hoy; si no, con el día.
export function horaDe(iso: string): string {
  const d = new Date(iso);
  const h = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return d.toDateString() === new Date().toDateString() ? h : `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })} ${h}`;
}
export function haceCuantoFue(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} ${min === 1 ? "minuto" : "minutos"}`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}

// Para el detalle completo: los nombres de los datos, legibles; los valores, como se guardaron.
const rotulo = (clave: string) => { const t = clave.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
function legible(v: unknown): string {
  if (v === null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  return Array.isArray(v) ? v.join(", ") : String(v);
}
export function aplanar(c: Contenido, prefijo = ""): [string, string][] {
  return Object.entries(c).flatMap(([k, v]): [string, string][] => {
    const nombre = prefijo ? `${prefijo}: ${rotulo(k).toLowerCase()}` : rotulo(k);
    if (v !== null && typeof v === "object" && !Array.isArray(v)) return aplanar(v as Contenido, nombre);
    return [[nombre, legible(v)]];
  });
}

