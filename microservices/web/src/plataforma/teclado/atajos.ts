import { useEffect } from "react";
import "./atajos.css";

// Atajos de los botones en la computadora (decisión 80): con Alt apretado, cada botón a la
// vista muestra una letra, y esa letra lo acciona. La letra sale del nombre del botón.
const RESERVADAS = new Set(["d", "e", "f"]); // en Windows, el navegador las usa con Alt
const ABECEDARIO = "abcdefghijklmnopqrstuvwxyz";
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// A cada nombre, en orden, su letra: la primera del nombre que esté libre; si no le queda
// ninguna, la primera libre del abecedario; si no quedan letras, ninguna.
// `pedidas`: la letra que un botón pide para sí (`data-atajo`, la que muestra su pantalla, como
// «Alt S»); se le da esa y nadie más la toma.
export function repartirLetras(nombres: string[], pedidas: (string | null)[] = []): (string | null)[] {
  const tomadas = new Set([...RESERVADAS, ...pedidas.filter((l): l is string => Boolean(l))]);
  return nombres.map((nombre, i) => {
    const pedida = pedidas[i];
    if (pedida) return pedida;
    const propias = [...sinAcentos(nombre)].filter((c) => ABECEDARIO.includes(c));
    const letra = propias.find((c) => !tomadas.has(c)) ?? [...ABECEDARIO].find((c) => !tomadas.has(c)) ?? null;
    if (letra) tomadas.add(letra);
    return letra;
  });
}

const visible = (e: HTMLElement) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== "hidden"; };
const nombreDe = (b: HTMLElement) => (b.getAttribute("aria-label") || b.textContent || b.getAttribute("title") || "").trim();

// Dónde están los botones que reciben letra al final (un menú que ya tiene sus propias teclas):
// lo dice cada aplicación. Si las letras no alcanzan, esos son los que se quedan sin la suya.
let alFinal: string | null = null;

// Los botones que reciben letra: los de la ventana abierta, si hay una; si no, los de la pantalla.
export function botonesALaVista(): HTMLElement[] {
  const ventanas = [...document.querySelectorAll<HTMLElement>("dialog[open], [role='dialog'], [aria-modal='true']")].filter(visible);
  const donde: ParentNode = ventanas.at(-1) ?? document;
  // Los que ya tienen su tecla (Alt + número, F2, F5 a F8) no llevan letra: así alcanzan para los demás.
  const todos = [...donde.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [role='button']:not([aria-disabled='true'])")]
    // Lo que está oculto para los lectores de pantalla (aria-hidden) no es algo que se use: no lleva letra.
    .filter((b) => visible(b) && !b.closest(".atajos-capa") && !b.closest("[aria-hidden='true']") && !b.hasAttribute("aria-keyshortcuts") && nombreDe(b) !== "");
  // Primero los de la pantalla; después los que la aplicación deja para el final.
  return alFinal ? [...todos.filter((b) => !b.closest(alFinal!)), ...todos.filter((b) => b.closest(alFinal!))] : todos;
}

// La letra de un botón, dibujada arriba a la izquierda de él.
function marcaDe(b: HTMLElement, letra: string): HTMLElement {
  const r = b.getBoundingClientRect();
  const marca = document.createElement("kbd");
  marca.className = "atajo-letra";
  marca.dataset.atajo = letra;
  marca.dataset.de = b.dataset.testid ?? "";
  marca.textContent = letra.toUpperCase();
  marca.style.left = `${Math.max(2, r.left - 6)}px`;
  marca.style.top = `${Math.max(2, r.top - 8)}px`;
  return marca;
}

// La capa con las letras de los botones a la vista, y qué botón acciona cada letra.
function capaDeLetras(): { capa: HTMLDivElement; porLetra: Map<string, HTMLElement> } {
  const botones = botonesALaVista();
  const letras = repartirLetras(botones.map(nombreDe), botones.map((b) => b.dataset.atajo?.toLowerCase() ?? null));
  const capa = document.createElement("div");
  capa.className = "atajos-capa";
  capa.setAttribute("aria-hidden", "true");
  const porLetra = new Map<string, HTMLElement>();
  botones.forEach((b, i) => {
    const letra = letras[i];
    if (!letra) return;
    porLetra.set(letra, b);
    capa.appendChild(marcaDe(b, letra));
  });
  return { capa, porLetra };
}

// Alt + una letra sola (sin Ctrl ni Cmd): la letra, en minúscula.
const letraConAlt = (e: KeyboardEvent) => (!e.altKey || e.ctrlKey || e.metaKey ? undefined : /^Key([A-Z])$/.exec(e.code)?.[1]?.toLowerCase());

// Las letras a la vista mientras Alt está apretado; null cuando no se ven.
function crearLetras() {
  let actual: ReturnType<typeof capaDeLetras> | null = null;
  // Con Alt apretado, la página lleva `con-alt`: así se ven también los números de Alt + número.
  const ocultar = () => { actual?.capa.remove(); actual = null; document.documentElement.classList.remove("con-alt"); };
  const mostrar = () => { ocultar(); actual = capaDeLetras(); document.body.appendChild(actual.capa); document.documentElement.classList.add("con-alt"); };
  const botonDe = (letra: string | undefined) => (letra && actual ? actual.porLetra.get(letra) : undefined);
  return { ocultar, mostrar, botonDe };
}

export function useAtajos(activos: boolean, opciones?: { alFinal?: string }): void {
  if (opciones) alFinal = opciones.alFinal ?? null;
  useEffect(() => {
    if (!activos) return;
    const letras = crearLetras();
    const alApretar = (e: KeyboardEvent) => {
      if (e.key === "Alt") { if (!e.repeat) letras.mostrar(); return; }
      const boton = letras.botonDe(letraConAlt(e));
      if (!boton) return;
      e.preventDefault(); e.stopPropagation();
      letras.ocultar();
      boton.focus();
      boton.click();
    };
    const alSoltar = (e: KeyboardEvent) => { if (e.key === "Alt") { e.preventDefault(); letras.ocultar(); } };
    window.addEventListener("keydown", alApretar, true);
    window.addEventListener("keyup", alSoltar, true);
    window.addEventListener("blur", letras.ocultar);
    return () => { letras.ocultar(); window.removeEventListener("keydown", alApretar, true); window.removeEventListener("keyup", alSoltar, true); window.removeEventListener("blur", letras.ocultar); };
  }, [activos]);
}
