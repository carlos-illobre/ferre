import type { KeyboardEvent, MutableRefObject } from "react";
import { irAlPrimerItem } from "../../../plataforma/teclado";

type Botones = HTMLButtonElement[];
const pestanaActual = () => document.querySelector<HTMLButtonElement>(".cuerpo .pestanas button[aria-current='page']") ?? document.querySelector<HTMLButtonElement>(".cuerpo .pestanas button");
const primeraDeMas = () => document.querySelector<HTMLButtonElement>(".cuerpo .mas-grilla button");
const parteDelMenu = () => document.querySelector<HTMLButtonElement>(".lateral nav button[aria-current='page']") ?? document.querySelector<HTMLButtonElement>(".lateral nav button");

// Dejar la marca de las flechas en un lugar aunque la pantalla nueva, al abrirse, ponga el foco en
// su búsqueda: se insiste un momento, salvo que la persona ya haya tocado otra cosa. En Vender el
// cursor va siempre a la búsqueda, se llegue como se llegue (Carlos, 2026-10-20; decisión 127). Y
// si se abrió con la marca del teclado, el cursor va a la caja de texto de la pantalla nueva, si
// tiene (decisión 137).
export function dejarElFocoEn(porLaMarca: MutableRefObject<boolean>, buscar: () => HTMLElement | null | undefined): void {
  let cancelado = false;
  const cancelar = () => { cancelado = true; };
  window.addEventListener("keydown", cancelar, { once: true, capture: true });
  window.addEventListener("mousedown", cancelar, { once: true, capture: true });
  const caja = () => porLaMarca.current ? document.querySelector<HTMLInputElement>(".cuerpo input[type='search']:not(:disabled), .cuerpo input[type='text']:not(:disabled)") : null;
  const destino = () => document.querySelector<HTMLInputElement>('[data-testid="vender"] [data-testid="busqueda"]:not(:disabled)') ?? caja() ?? buscar();
  for (const espera of [60, 150, 350, 600]) setTimeout(() => { if (!cancelado) destino()?.focus(); }, espera);
}

// → en el menú: solo las partes se abren; desde Desvincular o Salir vuelve a la pantalla sin
// tocarlos. Al cambiar de parte hay que esperar a que la pantalla nueva esté dibujada.
function abrirLaParte(boton: HTMLButtonElement, porLaMarca: MutableRefObject<boolean>) {
  const esParte = Boolean(boton.closest("nav"));
  const cambia = esParte && boton.getAttribute("aria-current") !== "page";
  if (cambia) boton.click();
  const destino = () => (esParte ? pestanaActual() : null) ?? primeraDeMas();
  if (cambia) dejarElFocoEn(porLaMarca, destino); else destino()?.focus();
}

// En el menú lateral: ↑ ↓ recorren todo lo que tiene (las partes y, debajo, los botones del espejo
// y Salir). Enter abre la parte y deja la marca en su primera pestaña (en Más, en su primera
// opción); → abre la parte y pasa a sus pestañas, si tiene; si no, a la pantalla.
export function teclasDelMenu(porLaMarca: MutableRefObject<boolean>) {
  return (e: KeyboardEvent<HTMLElement>) => {
    const botones: Botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
    const i = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const b = botones[i]!;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); botones[(i + (e.key === "ArrowDown" ? 1 : botones.length - 1)) % botones.length]!.focus(); }
    else if (e.key === "Enter" && b.closest("nav")) { e.preventDefault(); b.click(); dejarElFocoEn(porLaMarca, () => pestanaActual() ?? primeraDeMas()); }
    else if (e.key === "ArrowRight") { e.preventDefault(); abrirLaParte(b, porLaMarca); }
  };
}

// Las flechas solo pasan el foco, como en el menú: la pestaña se abre con Enter (pedido de Carlos
// del 2026-10-13); ← desde la primera vuelve al menú.
function moverEntrePestanas(botones: Botones, i: number, derecha: boolean) {
  const destino = botones[i + (derecha ? 1 : -1)];
  if (destino) destino.focus();
  else if (!derecha) parteDelMenu()?.focus();
}

const esDeLasPestanas = (e: KeyboardEvent<HTMLElement>) => !e.altKey && !e.ctrlKey && !e.metaKey && ["ArrowRight", "ArrowLeft", "Enter", "ArrowDown"].includes(e.key);

// En las pestañas de una parte: ← → pasan el foco; Enter abre la que tiene el foco (si ya estaba
// abierta, entra a la pantalla); ↓ entra a la pantalla que está abierta.
export function teclasDeLasPestanas(e: KeyboardEvent<HTMLElement>) {
  const botones: Botones = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
  const i = botones.indexOf(document.activeElement as HTMLButtonElement);
  if (i < 0 || !esDeLasPestanas(e)) return;
  e.preventDefault(); e.stopPropagation();
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") moverEntrePestanas(botones, i, e.key === "ArrowRight");
  else if (e.key === "Enter" && botones[i]!.getAttribute("aria-current") !== "page") botones[i]!.click();
  else irAlPrimerItem();
}
