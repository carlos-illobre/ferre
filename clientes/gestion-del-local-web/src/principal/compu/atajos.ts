import { useEffect } from "react";
import "./atajos.css";

// Atajos de los botones en la computadora (decisión 80): con Alt apretado, cada botón a la
// vista muestra una letra, y esa letra lo acciona. La letra sale del nombre del botón.
const RESERVADAS = new Set(["d", "e", "f"]); // en Windows, el navegador las usa con Alt
const ABECEDARIO = "abcdefghijklmnopqrstuvwxyz";
const sinAcentos = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// A cada nombre, en orden, su letra: la primera del nombre que esté libre; si no le queda
// ninguna, la primera libre del abecedario; si no quedan letras, ninguna.
export function repartirLetras(nombres: string[]): (string | null)[] {
  const tomadas = new Set(RESERVADAS);
  return nombres.map((nombre) => {
    const propias = [...sinAcentos(nombre)].filter((c) => ABECEDARIO.includes(c));
    const letra = propias.find((c) => !tomadas.has(c)) ?? [...ABECEDARIO].find((c) => !tomadas.has(c)) ?? null;
    if (letra) tomadas.add(letra);
    return letra;
  });
}

const visible = (e: HTMLElement) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== "hidden"; };
const nombreDe = (b: HTMLElement) => (b.getAttribute("aria-label") || b.textContent || b.getAttribute("title") || "").trim();

// Los botones que reciben letra: los de la ventana abierta, si hay una; si no, los de la pantalla.
function botonesALaVista(): HTMLElement[] {
  const ventanas = [...document.querySelectorAll<HTMLElement>("dialog[open], [role='dialog'], [aria-modal='true']")].filter(visible);
  const donde: ParentNode = ventanas.at(-1) ?? document;
  // Los que ya tienen su tecla (Alt + número, F2, F5 a F8) no llevan letra: así alcanzan para los demás.
  const todos = [...donde.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [role='button']:not([aria-disabled='true'])")]
    .filter((b) => visible(b) && !b.closest(".atajos-capa") && !b.hasAttribute("aria-keyshortcuts") && nombreDe(b) !== "");
  // Primero los de la pantalla, después los del menú de la izquierda: si no alcanzan las letras, se queda sin la suya el menú.
  return [...todos.filter((b) => !b.closest(".lateral")), ...todos.filter((b) => b.closest(".lateral"))];
}

export function useAtajos(activos: boolean): void {
  useEffect(() => {
    if (!activos) return;
    let capa: HTMLDivElement | null = null;
    let porLetra = new Map<string, HTMLElement>();
    const ocultar = () => { capa?.remove(); capa = null; porLetra = new Map(); };
    const mostrar = () => {
      ocultar();
      const botones = botonesALaVista();
      const letras = repartirLetras(botones.map(nombreDe));
      capa = document.createElement("div");
      capa.className = "atajos-capa";
      capa.setAttribute("aria-hidden", "true");
      botones.forEach((b, i) => {
        const letra = letras[i];
        if (!letra) return;
        porLetra.set(letra, b);
        const r = b.getBoundingClientRect();
        const marca = document.createElement("kbd");
        marca.className = "atajo-letra";
        marca.dataset.atajo = letra;
        marca.dataset.de = b.dataset.testid ?? "";
        marca.textContent = letra.toUpperCase();
        marca.style.left = `${Math.max(2, r.left - 6)}px`;
        marca.style.top = `${Math.max(2, r.top - 8)}px`;
        capa!.appendChild(marca);
      });
      document.body.appendChild(capa);
    };
    const alApretar = (e: KeyboardEvent) => {
      if (e.key === "Alt") { if (!e.repeat) mostrar(); return; }
      if (!e.altKey || e.ctrlKey || e.metaKey || !capa) return;
      const letra = /^Key([A-Z])$/.exec(e.code)?.[1]?.toLowerCase();
      const boton = letra ? porLetra.get(letra) : undefined;
      if (!boton) return;
      e.preventDefault(); e.stopPropagation();
      ocultar();
      boton.focus();
      boton.click();
    };
    const alSoltar = (e: KeyboardEvent) => { if (e.key === "Alt") { e.preventDefault(); ocultar(); } };
    window.addEventListener("keydown", alApretar, true);
    window.addEventListener("keyup", alSoltar, true);
    window.addEventListener("blur", ocultar);
    return () => { ocultar(); window.removeEventListener("keydown", alApretar, true); window.removeEventListener("keyup", alSoltar, true); window.removeEventListener("blur", ocultar); };
  }, [activos]);
}
