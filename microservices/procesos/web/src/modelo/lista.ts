import { esDelRecorrido, type Grafo, type Paso } from "./grafo";

// «Pasos» en el celular (E26 a E28): el recorrido como una lista, con una rama por cada salida de
// una decisión. Y los cambios de la lista (mover, agregar, quitar) dichos como flechas que se
// borran y flechas que se agregan, para que el editor los haga con sus comandos y Deshacer los
// cubra. Un proceso con caminos que vuelven atrás no entra en una lista: devuelve null.

export type Rama = { flecha: string; nombre: string; items: Item[] };
export type Item = { paso: Paso; ramas: Rama[] };

const salidas = (g: Grafo, id: string) => g.flechas.filter((f) => f.desde === id);
const entradas = (g: Grafo, id: string) => g.flechas.filter((f) => f.hasta === id);

/** La lista de pasos, o null si el proceso no se puede mostrar como lista. */
export function listaDe(g: Grafo): Item[] | null {
  const porId = new Map(g.pasos.map((p) => [p.id, p]));
  const inicios = g.pasos.filter((p) => p.tipo === "inicio");
  if (inicios.length !== 1) return inicios.length === 0 && g.pasos.filter(esDelRecorrido).length === 0 ? [] : null;
  const usados = new Set<string>();

  // Sigue el camino desde `id` hasta un fin, un paso sin salida o el punto donde se junta con
  // otra rama (`hasta`). Devuelve los items y dónde terminó.
  function camino(id: string | null, hasta: Set<string>): { items: Item[]; fin: string | null } | null {
    const items: Item[] = [];
    let actual = id;
    while (actual && !hasta.has(actual)) {
      if (usados.has(actual)) return null; // vuelve atrás o se cruza con otra rama
      usados.add(actual);
      const paso = porId.get(actual);
      if (!paso) return null;
      const fs = salidas(g, actual);
      if (fs.length <= 1) {
        items.push({ paso, ramas: [] });
        actual = fs[0]?.hasta ?? null;
        continue;
      }
      // Una decisión: cada salida es una rama, hasta donde se junten todas (si se juntan).
      const juntas = dondeSeJuntan(g, fs.map((f) => f.hasta));
      const tope = new Set([...hasta, ...(juntas ? [juntas] : [])]);
      const ramas: Rama[] = [];
      for (const f of fs) {
        const r = camino(f.hasta, tope);
        if (!r) return null;
        ramas.push({ flecha: f.id, nombre: f.nombre, items: r.items });
      }
      items.push({ paso, ramas });
      actual = juntas;
    }
    return { items, fin: actual };
  }

  const r = camino(inicios[0]!.id, new Set());
  if (!r) return null;
  // Lo que no se alcanzó (pasos sueltos) no tiene lugar en la lista.
  if (g.pasos.filter(esDelRecorrido).some((p) => !usados.has(p.id))) return null;
  return r.items;
}

// El primer paso al que llegan todas las ramas, si lo hay (donde se juntan después de una decisión).
function dondeSeJuntan(g: Grafo, comienzos: string[]): string | null {
  const alcanza = comienzos.map((c) => {
    const orden: string[] = [];
    const vistos = new Set<string>();
    const cola = [c];
    while (cola.length) {
      const id = cola.shift()!;
      if (vistos.has(id)) continue;
      vistos.add(id);
      orden.push(id);
      for (const f of salidas(g, id)) cola.push(f.hasta);
    }
    return orden;
  });
  const [primero, ...resto] = alcanza;
  return primero?.find((id) => entradas(g, id).length > 1 && resto.every((o) => o.includes(id))) ?? null;
}

/** Un cambio de flechas, para que el editor lo haga con sus comandos. */
export type CambioDeFlechas = { borrar: string[]; unir: { desde: string; hasta: string; nombre: string }[] };

/** Dónde va un paso: entre `desde` y `hasta` (que ya estaban unidos), o al final después de `desde`. */
export type Lugar = { desde: string; hasta: string | null };

/** Sacar un paso del recorrido: lo que llegaba a él pasa a ir a lo que seguía (E07, E29). */
export function alQuitar(g: Grafo, id: string): CambioDeFlechas {
  const llegan = entradas(g, id);
  const salen = salidas(g, id);
  const borrar = [...llegan, ...salen].map((f) => f.id);
  if (llegan.length >= 1 && salen.length === 1) {
    return { borrar, unir: llegan.map((f) => ({ desde: f.desde, hasta: salen[0]!.hasta, nombre: f.nombre })) };
  }
  return { borrar, unir: [] };
}

/** Poner un paso (nuevo o que se mueve) en un lugar del recorrido (E27, E28). */
export function alPoner(g: Grafo, id: string, lugar: Lugar): CambioDeFlechas {
  if (lugar.hasta === null) return { borrar: [], unir: [{ desde: lugar.desde, hasta: id, nombre: "" }] };
  const entre = g.flechas.find((f) => f.desde === lugar.desde && f.hasta === lugar.hasta);
  return {
    borrar: entre ? [entre.id] : [],
    unir: [
      { desde: lugar.desde, hasta: id, nombre: entre?.nombre ?? "" },
      { desde: id, hasta: lugar.hasta, nombre: "" },
    ],
  };
}

/** Aplica un cambio sobre el grafo (para calcular el siguiente cambio sin el editor). */
export function aplicar(g: Grafo, cambio: CambioDeFlechas, nuevaId = (i: number) => `nueva-${i}`): Grafo {
  const quedan = g.flechas.filter((f) => !cambio.borrar.includes(f.id));
  return { ...g, flechas: [...quedan, ...cambio.unir.map((u, i) => ({ id: nuevaId(i), ...u }))] };
}

/** Mover un paso a otro lugar: primero se saca y después se pone, sobre el grafo ya sin él. */
export function alMover(g: Grafo, id: string, lugar: Lugar): CambioDeFlechas[] {
  if (lugar.desde === id || lugar.hasta === id) return [];
  const quitar = alQuitar(g, id);
  const sinEl = aplicar(g, quitar);
  return [quitar, alPoner(sinEl, id, lugar)];
}

/** Los lugares de una lista, en orden: entre cada paso y el siguiente, y al final de cada rama. */
export function lugaresDe(items: Item[], antes: string | null = null): Lugar[] {
  const lugares: Lugar[] = [];
  let previo = antes;
  for (const item of items) {
    if (previo) lugares.push({ desde: previo, hasta: item.paso.id });
    for (const rama of item.ramas) lugares.push(...lugaresDe(rama.items, item.paso.id));
    previo = item.ramas.length ? null : item.paso.id;
  }
  if (previo && items.at(-1)?.paso.tipo !== "fin") lugares.push({ desde: previo, hasta: null });
  return lugares;
}
