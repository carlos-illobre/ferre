// Búsqueda instantánea sobre una lista en memoria: varias palabras en cualquier orden, sin
// acentos ni mayúsculas, por descripción, marca o cualquiera de sus códigos. El índice se
// arma una vez: con 50.000 elementos sigue respondiendo en milisegundos. No depende de
// nada de la aplicación: se puede copiar a otro proyecto tal cual.

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
function puntajeEnCodigos(codigos: string[], q: string): number {
  let mejor = 0;
  for (const c of codigos) {
    if (c === q) return 100;
    if (c.startsWith(q)) mejor = 5;
  }
  return mejor;
}

// La primera palabra pesa el doble.
function puntajeEnPalabras(palabras: string[], q: string): number {
  let mejor = 0;
  palabras.forEach((p, j) => {
    if (p === q) mejor = Math.max(mejor, j === 0 ? 20 : 10);
    else if (p.startsWith(q)) mejor = Math.max(mejor, j === 0 ? 4 : 2);
  });
  return mejor;
}

const puntajeDe = (codigos: string[], palabras: string[], q: string) => {
  const enCodigos = puntajeEnCodigos(codigos, q);
  return enCodigos === 100 ? 100 : Math.max(enCodigos, puntajeEnPalabras(palabras, q));
};

// El puntaje del elemento para toda la consulta; null si alguna palabra no está.
function puntajeDelItem(codigos: string[], palabras: string[], consulta: string[]): number | null {
  let puntaje = 0;
  for (const q of consulta) {
    const mejor = puntajeDe(codigos, palabras, q);
    if (mejor === 0) return null;
    puntaje += mejor;
  }
  return puntaje;
}

export function buscar<T extends Buscable>(indice: Indice<T>, consulta: string, maximo = 50): T[] {
  const consultaPalabras = normalizar(consulta).split(" ").filter(Boolean);
  if (consultaPalabras.length === 0) return [];
  const puntuados: { item: T; puntaje: number; largo: number }[] = [];
  indice.items.forEach((item, i) => {
    const palabras = indice.palabras[i]!;
    const puntaje = puntajeDelItem(indice.codigos[i]!, palabras, consultaPalabras);
    if (puntaje !== null) puntuados.push({ item, puntaje, largo: palabras.length });
  });
  puntuados.sort((a, b) => b.puntaje - a.puntaje || a.largo - b.largo);
  return puntuados.slice(0, maximo).map((p) => p.item);
}
