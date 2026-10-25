// Dónde están la pantalla y sus listas, según lo que dice cada aplicación (ver flechas.ts).
const LISTAS = "ul, ol, table, [role='list'], .lista";
const NO_SON_NUNCA = "[role='listbox'], [data-sin-flechas], [data-flechas-propias], thead";

// Lo que cada aplicación dice de su propia disposición. Sin configurar, las flechas valen en
// toda la página y no hay nada arriba de la primera fila.
export type DisposicionParaFlechas = {
  // Dónde está la pantalla (lo que no es menú ni barra): ahí se buscan las listas.
  pantalla: string;
  // Listas que no se recorren con esta marca porque se recorren de otra forma (un menú, unas pestañas).
  noSonListas?: string;
  // Dónde no se toma una caja de texto como «la búsqueda de la pantalla».
  noSonCajas?: string;
  // Lo que queda con el foco si la pantalla no tiene caja de texto.
  sinCaja?: () => HTMLElement | null;
  // Lo que está arriba de la primera fila (la pestaña abierta, por ejemplo): ↑ desde la primera va ahí.
  arribaDeLaLista?: () => HTMLElement | null;
};
let disposicion: DisposicionParaFlechas = { pantalla: "body" };
export const fijarDisposicion = (d: DisposicionParaFlechas) => { disposicion = d; };
export const laDisposicion = () => disposicion;
const noSon = () => [disposicion.noSonListas, NO_SON_NUNCA].filter(Boolean).join(", ");
export const ACCIONABLE = "button:not([disabled]), a[href], [role='button'], [data-principal], .elegible";
export const visible = (e: HTMLElement) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";

// Dónde valen las flechas: la ventana abierta, si hay una; si no, la pantalla.
export function alcance(): HTMLElement | null {
  const ventanas = [...document.querySelectorAll<HTMLElement>("dialog[open], [role='dialog'], [aria-modal='true']")].filter(visible);
  return ventanas.at(-1) ?? document.querySelector<HTMLElement>(disposicion.pantalla);
}

const filasDe = (lista: HTMLElement) => lista.tagName === "TABLE"
  ? [...lista.querySelectorAll<HTMLElement>("tbody > tr")].filter((f) => f.closest("table") === lista && !f.classList.contains("hija"))
  : ([...lista.children] as HTMLElement[]);

// Las filas de la lista de la pantalla: las de la primera lista que tenga alguna.
export function filasDeLaPantalla(): HTMLElement[] {
  const donde = alcance();
  if (!donde) return [];
  for (const lista of donde.querySelectorAll<HTMLElement>(LISTAS)) {
    if (!visible(lista) || lista.closest(noSon())) continue;
    // Solo cuentan las filas que hacen algo con Enter: una lista que nada más muestra datos no se recorre.
    const visibles = filasDe(lista).filter((f) => visible(f) && (f.matches(ACCIONABLE) || f.querySelector(ACCIONABLE) !== null));
    if (visibles.length) return visibles;
  }
  return [];
}
