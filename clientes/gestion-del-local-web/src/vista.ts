// Dos interfaces sobre la misma app (RNF-04 y RNF-05): la de celular (src/App.tsx, diseño de
// mockups/Ferre iOS.html) y la de escritorio (src/escritorio/, tablas y teclado). Se elige
// por el ancho de la pantalla al abrir; cada una carga solo sus pantallas y sus estilos.
export const ANCHO_DE_ESCRITORIO = 900;
export type Vista = "celular" | "escritorio";
export const vistaPara = (ancho: number): Vista => (ancho >= ANCHO_DE_ESCRITORIO ? "escritorio" : "celular");
