// Búsqueda instantánea sobre el catálogo en memoria (issue #14): varias palabras en
// cualquier orden, sin acentos ni mayúsculas, por descripción, marca, código del
// proveedor o código de barras. Índice precalculado una vez: con 50.000 productos sigue
// respondiendo en milisegundos.

export type Buscable = { id: string; descripcion: string; marca?: string | null; codigos?: (string | null | undefined)[] };

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9/.,\- ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type Indice<T extends Buscable> = { items: T[]; palabras: string[][]; codigos: string[][] };

export function indexar<T extends Buscable>(items: T[]): Indice<T> {
  return {
    items,
    palabras: items.map((p) => normalizar(`${p.descripcion} ${p.marca ?? ""}`).split(" ").filter(Boolean)),
    codigos: items.map((p) => (p.codigos ?? []).filter((c): c is string => Boolean(c)).map((c) => normalizar(c).replace(/ /g, ""))),
  };
}

// Cada palabra de la consulta tiene que ser el comienzo de alguna palabra de la
// descripción o marca ("mad" encuentra "madera", "6" encuentra "6" y "6mm" pero no
// "17060e"), o de algún código. Puntaje: código exacto primero, después palabra exacta,
// después comienzo de palabra; a igual puntaje, la descripción más corta primero.
export function buscar<T extends Buscable>(indice: Indice<T>, consulta: string, maximo = 50): T[] {
  const consultaPalabras = normalizar(consulta).split(" ").filter(Boolean);
  if (consultaPalabras.length === 0) return [];
  const puntuados: { item: T; puntaje: number; largo: number }[] = [];
  for (let i = 0; i < indice.items.length; i++) {
    const palabras = indice.palabras[i]!;
    const codigos = indice.codigos[i]!;
    let puntaje = 0;
    let todas = true;
    for (const q of consultaPalabras) {
      let mejor = 0;
      for (const c of codigos) {
        if (c === q) { mejor = 100; break; }
        if (c.startsWith(q)) mejor = Math.max(mejor, 5);
      }
      if (mejor < 100) {
        for (let j = 0; j < palabras.length; j++) {
          const p = palabras[j]!;
          if (p === q) { mejor = Math.max(mejor, j === 0 ? 20 : 10); }
          else if (p.startsWith(q)) mejor = Math.max(mejor, j === 0 ? 4 : 2);
        }
      }
      if (mejor === 0) { todas = false; break; }
      puntaje += mejor;
    }
    if (todas) puntuados.push({ item: indice.items[i]!, puntaje, largo: palabras.length });
  }
  puntuados.sort((a, b) => b.puntaje - a.puntaje || a.largo - b.largo);
  return puntuados.slice(0, maximo).map((p) => p.item);
}
