import { pedir, pedirEn } from "../../plataforma/comandos";
import { esCampo, teclaDe } from "./tecla";

// Una línea de una tabla de teclas: qué tecla pide qué acción (ADR-029). Por defecto no vale con
// el cursor en un campo de texto (ahí las teclas escriben); `enCampos` la habilita también ahí, y
// `donde` la limita a lo que esté adentro de ese lugar (por ejemplo, la búsqueda de Vender).
// `lugar`: la acción es del lugar donde está el foco (una cantidad, un renglón), no de la pantalla.
export type Linea = { tecla: string; accion: string; enCampos?: boolean; donde?: string; lugar?: boolean };

// Con el foco en una zona que se recorre por su cuenta (el menú, las pestañas), las teclas de
// moverse son de la zona: no llegan a la pantalla, salvo las líneas de ese lugar.
const DE_MOVERSE = /^(Mayús\+)?(Arrow|Enter$|Escape$|Tab$| $|Home$|End$)/;
type Donde = { objetivo: Element | null; enCampo: boolean; enZona: boolean };

function vale(l: Linea, tecla: string, d: Donde): boolean {
  if (l.tecla !== tecla) return false;
  if (l.donde) return Boolean(d.objetivo?.closest(l.donde));
  if (d.enZona && DE_MOVERSE.test(tecla)) return false;
  return !d.enCampo || Boolean(l.enCampos);
}

function dondeEsta(objetivo: EventTarget | null, zonas?: string): Donde {
  const el = objetivo instanceof Element ? objetivo : null;
  return { objetivo: el, enCampo: esCampo(objetivo), enZona: Boolean(zonas && el?.closest(zonas)) };
}

// Pide, en orden, las acciones de las líneas de esa tecla: la primera que alguien hace se queda
// con la tecla.
export function teclear(tabla: readonly Linea[], e: KeyboardEvent, zonas?: string): boolean {
  if (e.defaultPrevented || e.isComposing) return false;
  const tecla = teclaDe(e);
  const d = dondeEsta(e.target, zonas);
  for (const l of tabla) {
    if (vale(l, tecla, d) && (l.lugar ? pedirEn(d.objetivo, l.accion) : pedir(l.accion))) { e.preventDefault(); return true; }
  }
  return false;
}

// Las etiquetas que se muestran al lado de cada acción: la tecla de su primera línea.
export const etiquetasDe = (tabla: readonly Linea[]): Record<string, string> =>
  Object.fromEntries([...tabla].reverse().map((l) => [l.accion, l.tecla.replace("ArrowDown", "↓").replace("ArrowUp", "↑").replace("Escape", "Esc").replace("Delete", "Supr")]));
