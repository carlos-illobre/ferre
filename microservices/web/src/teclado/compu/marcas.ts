// Las marcas del HTML por las que el teclado de la computadora reconoce la pantalla (ADR-029).
// Son lo único que el teclado sabe de cómo está dibujada: ningún nombre de clase ni `data-testid`.
// Quien dibuja las pone; si una pieza cambia de forma, conserva su marca y el teclado sigue andando.
//   data-zona="menu"       el menú de la izquierda (sus partes van en un `nav`)
//   data-zona="pestanas"   las pestañas de la parte; cada una lleva data-pestana="<ruta>"
//   data-zona="pantalla"   la pantalla abierta (lo que no es menú ni pestañas)
//   data-zona="mas"        la grilla de opciones de Más
//   data-busqueda-principal  la búsqueda a la que vuelve siempre el cursor (la de Vender)
//   data-margenes          los márgenes de la ficha, que se eligen con ← → desde la ficha
//   data-ficha-con-flechas, data-ficha-vertical  la ficha y lo que se recorre con ↑ ↓ adentro
//   data-filas, data-fila  una lista que se recorre por sus filas
//   data-flechas-propias   una lista que se recorre por su cuenta: las flechas de la pantalla no la tocan
//   data-sin-flechas       algo que parece una lista y no lo es
//   data-flechas-de-afuera un grupo de opciones que recorre quien lo contiene
//   data-principal         la acción principal de una fila (Enter la hace)
export const MENU = "[data-zona='menu']";
export const PESTANAS = "[data-zona='pestanas']";
export const PANTALLA = "[data-zona='pantalla']";
export const GRILLA_DE_MAS = "[data-zona='mas']";
export const BUSQUEDA_PRINCIPAL = "[data-busqueda-principal]";
export const MARGENES = "[data-margenes]";

export const botonesDelMenu = () => [...document.querySelectorAll<HTMLButtonElement>(`${MENU} nav button`)];
export const botonesDeLasPestanas = () => [...document.querySelectorAll<HTMLButtonElement>(`${PESTANAS} button`)];
export const pestanaAbierta = () => botonesDeLasPestanas().find((b) => b.getAttribute("aria-current") === "page") ?? botonesDeLasPestanas()[0] ?? null;
export const parteAbierta = () => botonesDelMenu().find((b) => b.getAttribute("aria-current") === "page") ?? botonesDelMenu()[0] ?? null;
export const rutaDeLaPestana = (b: HTMLElement | null | undefined) => b?.dataset.pestana ?? "";
export const laPestana = (ruta: string) => document.querySelector<HTMLButtonElement>(`${PESTANAS} [data-pestana="${ruta}"]`);
