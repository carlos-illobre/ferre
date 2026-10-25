import { alcance, filasDeLaPantalla, laDisposicion, visible } from "./disposicion";

// La marca de las flechas: una fila entera de la lista de la pantalla (ver flechas.ts).
let marcada: HTMLElement | null = null;
export function marcar(fila: HTMLElement | null): void {
  if (marcada === fila) return;
  marcada?.removeAttribute("data-flecha");
  marcada = fila;
  if (fila) { fila.setAttribute("data-flecha", ""); fila.scrollIntoView?.({ block: "nearest" }); }
}
// La fila que tiene la marca, si sigue en pantalla.
export function filaMarcada(): HTMLElement | null {
  if (marcada && (!marcada.isConnected || !visible(marcada))) marcar(null);
  return marcada;
}
export const quitarLaMarca = (): void => marcar(null);

// La caja de texto de la pantalla: la primera a la vista y habilitada que no sea de otra cosa.
function cajaDeLaPantalla(donde: HTMLElement | null): HTMLElement | undefined {
  const { noSonCajas } = laDisposicion();
  if (!donde) return undefined;
  return [...donde.querySelectorAll<HTMLElement>("input[type='search'], input[type='text'], input:not([type])")].find((c) => visible(c) && !(c as HTMLInputElement).disabled && !(noSonCajas && c.closest(noSonCajas)));
}

const conMarcaPropia = (donde: HTMLElement | null) => (donde?.querySelector<HTMLElement>("[data-flechas-propias]")?.children.length ?? 0) > 0;

// Desde las pestañas (o al entrar a una pantalla con el teclado): marca la primera fila y deja el
// cursor de escritura en la caja de texto de la pantalla. Sin filas no hace nada: devuelve falso
// y la marca se queda donde estaba.
export function irAlPrimerItem(): boolean {
  const donde = alcance();
  // Una pantalla que ya lleva su propia marca por la lista (Catálogo, desde la búsqueda): alcanza con dejar el cursor en su búsqueda.
  const filas = filasDeLaPantalla();
  if (filas.length === 0 && !conMarcaPropia(donde)) return false;
  (cajaDeLaPantalla(donde) ?? laDisposicion().sinCaja?.())?.focus();
  if (filas.length) marcar(filas[0]!);
  return true;
}

// La acción principal de una fila: la que marca con `data-principal`; si no, la fila misma si
// se puede accionar; si no, lo primero accionable que tenga.
export function abrir(fila: HTMLElement): void {
  const destino = [...fila.querySelectorAll<HTMLElement>("[data-principal]")].find(visible)
    ?? (fila.matches("button, a[href], [role='button'], [data-principal], .elegible") ? fila : [...fila.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")].find(visible) ?? fila);
  destino.click();
}
