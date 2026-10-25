// Acciones con nombre que ofrece lo que está a la vista (ADR-029). Quien las pide (el teclado, un
// botón, una paleta de comandos) no sabe quién las hace; quien las hace no sabe quién las pide.
// Sirve para cualquier aplicación.

// Una acción: hace lo suyo, o devuelve `false` si ahora no aplica (y lo que la pidió sigue de largo).
export type Accion = () => boolean | void;
export type Acciones = Readonly<Record<string, Accion | null | undefined>>;
// `encima`: lo de una ventana abierta, que tapa a la pantalla de atrás aunque se haya ofrecido antes.
type Oferta = { leer: () => Acciones; encima: boolean; orden: number };

const ofertas: Oferta[] = [];
let siguiente = 0;

export function ofrecer(leer: () => Acciones, encima = false): () => void {
  const oferta = { leer, encima, orden: siguiente++ };
  ofertas.push(oferta);
  return () => { const i = ofertas.indexOf(oferta); if (i >= 0) ofertas.splice(i, 1); };
}

const masArriba = (a: Oferta, b: Oferta) => Number(a.encima) - Number(b.encima) || a.orden - b.orden;

// La acción con ese nombre de la oferta de más arriba, si alguien la ofrece.
export function accionDe(nombre: string): Accion | undefined {
  const deArriba = [...ofertas].sort(masArriba).reverse();
  for (const o of deArriba) { const a = o.leer()[nombre]; if (a) return a; }
  return undefined;
}

// Pide la acción. Devuelve si alguien la hizo.
export function pedir(nombre: string): boolean {
  const accion = accionDe(nombre);
  return accion ? accion() !== false : false;
}

// Para las pruebas: nadie ofrece nada.
export function olvidarLasOfertas(): void { ofertas.length = 0; }
