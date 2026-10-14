import { esDelRecorrido, NOMBRE_DEL_TIPO, type Flecha, type Grafo, type Paso } from "./grafo";

// El orden del recorrido (E11), los errores de forma (E14) y la tabla de pasos.

const salidas = (g: Grafo, id: string) => g.flechas.filter((f) => f.desde === id);
const entradas = (g: Grafo, id: string) => g.flechas.filter((f) => f.hasta === id);

/**
 * Los pasos en el orden en que se recorren: desde cada inicio, siguiendo cada camino hasta el
 * final antes de pasar al siguiente (en una decisión, primero la primera salida entera). Lo que no
 * se alcanza desde un inicio va al final, y los documentos y las notas, después de todo.
 */
export function enOrden(g: Grafo): Paso[] {
  const porId = new Map(g.pasos.map((p) => [p.id, p]));
  const vistos = new Set<string>();
  const orden: Paso[] = [];
  const recorrer = (desde: string) => {
    const pila = [desde];
    while (pila.length) {
      const id = pila.pop()!;
      if (vistos.has(id)) continue;
      vistos.add(id);
      const paso = porId.get(id);
      if (paso) orden.push(paso);
      pila.push(...salidas(g, id).map((f) => f.hasta).reverse());
    }
  };
  for (const p of g.pasos.filter((x) => x.tipo === "inicio")) recorrer(p.id);
  for (const p of g.pasos.filter(esDelRecorrido)) if (!vistos.has(p.id)) recorrer(p.id);
  return [...orden, ...g.pasos.filter((p) => !esDelRecorrido(p))];
}

/** «Sí: Cargar en la venta · No: Anotar el pedido», o el paso siguiente solo. */
export function sigueCon(g: Grafo, id: string): string {
  const nombre = (pid: string) => g.pasos.find((p) => p.id === pid)?.nombre || "(sin nombre)";
  const fs = salidas(g, id);
  if (fs.length === 0) return "—";
  if (fs.length === 1 && !fs[0]!.nombre) return nombre(fs[0]!.hasta);
  return fs.map((f) => (f.nombre ? `${f.nombre}: ${nombre(f.hasta)}` : nombre(f.hasta))).join(" · ");
}

export type FilaDePaso = { id: string; tipo: Paso["tipo"]; nombre: string; tipoTexto: string; carril: string; pantalla: string; sigueCon: string };

/** La tabla «Los pasos, en orden» (E11). */
export function filasDe(g: Grafo): FilaDePaso[] {
  return enOrden(g).map((p) => ({
    id: p.id, tipo: p.tipo, nombre: p.nombre, tipoTexto: NOMBRE_DEL_TIPO[p.tipo], carril: p.carril ?? "—", pantalla: p.pantalla || "—",
    sigueCon: esDelRecorrido(p) ? sigueCon(g, p.id) : "—",
  }));
}

export type ErroresDeForma = { porPaso: Map<string, string>; generales: string[] };

/**
 * E14: un paso al que no llega ninguna flecha, una decisión con una sola salida, un proceso sin
 * inicio o sin fin. No impiden guardar: se marcan para que se vea qué falta.
 */
export function erroresDeForma(g: Grafo): ErroresDeForma {
  const porPaso = new Map<string, string>();
  const recorrido = g.pasos.filter(esDelRecorrido);
  for (const p of recorrido) {
    const llegan = entradas(g, p.id).length;
    const salen = salidas(g, p.id).length;
    if (p.tipo !== "inicio" && llegan === 0) porPaso.set(p.id, "Ninguna flecha llega a este paso");
    else if ((p.tipo === "decision" || p.tipo === "paralelo") && salen < 2 && llegan < 2) porPaso.set(p.id, p.tipo === "decision" ? "Una decisión necesita al menos dos salidas" : "Un paso en paralelo necesita al menos dos salidas");
  }
  const generales: string[] = [];
  if (recorrido.length && !recorrido.some((p) => p.tipo === "inicio")) generales.push("Falta el inicio");
  if (recorrido.length && !recorrido.some((p) => p.tipo === "fin")) generales.push("Falta el fin");
  return { porPaso, generales };
}

export const flechasDe = (g: Grafo): Flecha[] => g.flechas;
