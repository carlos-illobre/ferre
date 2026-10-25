import { etiquetar } from "../../plataforma/comandos";
import { etiquetasDe, teclear, type Linea } from "./tabla";

// Un solo oyente de teclas para toda la aplicación: cada tecla pide la acción de su tabla. Las
// etiquetas («F2») quedan a disposición de quien quiera mostrarlas. Devuelve cómo sacarlo.
export function instalarTabla(tabla: readonly Linea[], zonas?: string): () => void {
  etiquetar(etiquetasDe(tabla));
  const alTeclear = (e: KeyboardEvent) => { teclear(tabla, e, zonas); };
  window.addEventListener("keydown", alTeclear);
  return () => window.removeEventListener("keydown", alTeclear);
}
