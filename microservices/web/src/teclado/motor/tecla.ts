// El nombre de una tecla como se escribe en las tablas: «F2», «E», «Alt+C», «Mayús+1», «Ctrl+B»,
// «ArrowDown», «Enter», «+». Las letras y los números salen de la tecla física (con Mayúsculas, la
// «3» del teclado dice «#»); lo demás, de lo que la tecla escribe.
type Evento = Pick<KeyboardEvent, "code" | "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">;
const fisicaDe = (code: string) => /^Key([A-Z])$/.exec(code)?.[1] ?? /^Digit(\d)$/.exec(code)?.[1];
// Mayúsculas cuenta en las letras, los números y las teclas con nombre; no en un signo («+» ya la lleva).
const modificadores = (e: Evento, conMayus: boolean) => [e.ctrlKey || e.metaKey ? "Ctrl" : "", e.altKey ? "Alt" : "", conMayus ? "Mayús" : ""];

export function teclaDe(e: Evento): string {
  const fisica = fisicaDe(e.code);
  const base = fisica ?? e.key;
  const conMayus = e.shiftKey && (fisica !== undefined || base.length > 1);
  return [...modificadores(e, conMayus), base].filter(Boolean).join("+");
}

export const esCampo = (el: EventTarget | null): boolean =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName));
