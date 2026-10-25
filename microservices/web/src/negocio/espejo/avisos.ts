import { mandarAlOtro } from "../../datos/vinculo";
import { enEspejo, oyentesDeAvisos } from "./estado";

// Contarle al otro lado algo que terminó acá: se le muestra un momento y no se guarda.
export function contarAlEspejo(texto: string): void {
  if (enEspejo()) void mandarAlOtro({ tipo: "aviso", texto });
}

export function alAvisoDelEspejo(oyente: (texto: string) => void): () => void {
  oyentesDeAvisos.add(oyente);
  if (avisoPendiente && avisoPendiente.hasta > Date.now()) oyente(avisoPendiente.texto);
  avisoPendiente = null;
  return () => { oyentesDeAvisos.delete(oyente); };
}
// Un aviso de algo que pasó en la computadora por una acción de este celular (la computadora
// entró): se muestra en el mismo lugar que los avisos del espejo. Si todavía no hay dónde
// mostrarlo (la pantalla de siempre no se abrió), espera unos segundos a que aparezca.
let avisoPendiente: { texto: string; hasta: number } | null = null;
export function avisarEnEsteDispositivo(texto: string): void {
  if (oyentesDeAvisos.size) { oyentesDeAvisos.forEach((o) => o(texto)); return; }
  avisoPendiente = { texto, hasta: Date.now() + 5000 };
}
