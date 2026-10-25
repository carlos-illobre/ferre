// Lo que el módulo toma del navegador para saber cuándo hace falta la red, sin preguntar nada
// (ADR-030): si la página está a la vista y si el navegador dice que hay red. Se arma con el
// `document` y la `window` de verdad, o con dobles en las pruebas.

// Si la página está a la vista, y cuándo cambia.
export type Vista = { visible(): boolean; alCambiar(oyente: () => void): () => void };
// Cuándo el navegador avisa que se fue o volvió la red.
export type Red = { alCambiar(oyente: (enLinea: boolean) => void): () => void };

type Escuchable = Pick<EventTarget, "addEventListener" | "removeEventListener">;
const escuchar = (donde: Escuchable, evento: string, oyente: () => void) => {
  donde.addEventListener(evento, oyente);
  return () => donde.removeEventListener(evento, oyente);
};

// Sin documento (fuera del navegador), la página está siempre a la vista.
export function vistaDe(documento: (Escuchable & { visibilityState: string }) | undefined): Vista {
  if (!documento) return { visible: () => true, alCambiar: () => () => {} };
  return {
    visible: () => documento.visibilityState !== "hidden",
    alCambiar: (oyente) => escuchar(documento, "visibilitychange", oyente),
  };
}

// Sin ventana, el navegador nunca avisa nada.
export function redDe(ventana: Escuchable | undefined): Red {
  if (!ventana) return { alCambiar: () => () => {} };
  return {
    alCambiar(oyente) {
      const dejarSeFue = escuchar(ventana, "offline", () => oyente(false));
      const dejarVolvio = escuchar(ventana, "online", () => oyente(true));
      return () => { dejarSeFue(); dejarVolvio(); };
    },
  };
}
