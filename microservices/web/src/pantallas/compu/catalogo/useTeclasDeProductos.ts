import { useCallback, useEffect, useRef } from "react";
import { esperarBusqueda } from "../../../negocio/catalogo";
import { MARGENES } from "../../../negocio/precios";
import { useTeclasGlobales } from "../../../plataforma/teclado";
import type { EstadoDeProductos } from "./useProductos";

// Las teclas de Productos: ↑ ↓ eligen (y la ficha sigue), Mayús + 1 a 5 fijan el margen, «+»
// agrega a la venta, Enter entra a la ficha y Esc vuelve a la búsqueda (o la borra), F1 pliega
// «Así se calcula», Alt F abre los filtros y Alt E le pide el lector al celular.
type Tecla = KeyboardEvent;

// Enter lleva el foco a la ficha, al margen elegido (o al primero); sin margen que elegir, a «Listo».
export function entrarALaFicha(ficha: HTMLElement | null) {
  const entrar = (f: HTMLElement | null) => {
    if (!f) return;
    const margenes = [...f.querySelectorAll<HTMLButtonElement>(".margenes button:not([disabled])")];
    (margenes.find((b) => b.getAttribute("aria-checked") === "true") ?? margenes[0] ?? f.querySelector<HTMLElement>("[data-testid='ficha-listo']"))?.focus();
  };
  // Si la ficha ya está, enseguida; si el elegido recién cambió, cuando se dibuje la suya.
  if (ficha) entrar(ficha); else requestAnimationFrame(() => entrar(document.querySelector<HTMLElement>("[data-testid='ficha-producto']")));
}

function conAlt(e: Tecla, x: EstadoDeProductos): boolean {
  if (!e.altKey) return false;
  if (e.code === "KeyF") { e.preventDefault(); x.setViendoFiltros(true); return true; }
  if (e.code !== "KeyE") return false;
  const b = document.querySelector<HTMLButtonElement>("[data-testid='pedir-lector']");
  if (b) { e.preventDefault(); b.click(); }
  return true;
}

// Si la lista todavía no alcanzó a lo que se escribió (llega un instante después de tipear), Enter
// espera la respuesta y abre el primero: no abre la fila de la lista vieja.
function enter(e: Tecla, x: EstadoDeProductos) {
  if ((e.target as HTMLElement).tagName === "BUTTON") return;
  e.preventDefault();
  const abrir = (i: number) => { x.setElegido(i); entrarALaFicha(x.ficha.current); };
  if (x.consulta === x.consultaEstable && !x.lista.cargando) { if (x.lista.productos[x.elegido]) abrir(x.elegido); }
  else if (x.consulta.trim()) void esperarBusqueda(x.consulta).then((r) => { if (r[0]) abrir(0); });
}

// Arriba de la primera fila están las pestañas: la marca de las flechas vuelve a ellas (decisión 82).
function arriba(e: Tecla, x: EstadoDeProductos) {
  e.preventDefault();
  if (x.elegido === 0) document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']")?.focus();
  else x.setElegido((i) => Math.max(i - 1, 0));
}

function enLaLista(e: Tecla, x: EstadoDeProductos): boolean {
  if (e.key === "ArrowDown") { e.preventDefault(); x.setElegido((i) => Math.min(i + 1, x.lista.productos.length - 1)); }
  else if (e.key === "ArrowUp") arriba(e, x);
  else if (e.key === "Enter") enter(e, x);
  else return false;
  return true;
}

// «+» agrega el elegido a la venta (015-E27); sin permiso de vender, no hace nada. Mayús + 1 a 5
// fijan el margen (se mira e.code porque con Mayúsculas la tecla «3» reporta «#»).
const sinModificador = (e: Tecla) => !e.ctrlKey && !e.metaKey && !e.altKey;

const esMargen = (e: Tecla, x: EstadoDeProductos) => x.fijaMargen && e.shiftKey && /^Digit[1-5]$/.test(e.code);

function delElegido(e: Tecla, x: EstadoDeProductos) {
  const p = x.lista.productos[x.elegido];
  if (!p) return;
  if (e.key === "+" && sinModificador(e) && x.puedeVender) { e.preventDefault(); x.agregar(p); return; }
  if (!esMargen(e, x)) return;
  e.preventDefault();
  if (p.costo_neto !== null) x.actualizar(p.id, { margen_elegido: MARGENES[Number(e.code.slice(5)) - 1]! });
}

// F1 pliega «Así se calcula»; Esc vuelve a la búsqueda (y, fuera de la ficha, la borra).
function f1OEsc(e: Tecla, x: EstadoDeProductos, enFicha: boolean): boolean {
  if (e.key === "F1") { e.preventDefault(); x.plegarCalculo(); return true; }
  if (e.key !== "Escape") return false;
  if (!enFicha) x.setConsulta("");
  x.caja.current?.focus();
  return true;
}

const hayVentana = (x: EstadoDeProductos) => x.viendoFiltros || Boolean(document.querySelector("dialog[open]"));
const enLaFicha = (e: Tecla, x: EstadoDeProductos) => e.target instanceof Node && Boolean(x.ficha.current?.contains(e.target));

function teclear(e: Tecla, x: EstadoDeProductos) {
  if (hayVentana(x)) return;
  const enFicha = enLaFicha(e, x);
  if (conAlt(e, x) || f1OEsc(e, x, enFicha) || (!enFicha && enLaLista(e, x))) return;
  delElegido(e, x);
}

export function useTeclasDeProductos(x: EstadoDeProductos) {
  const actual = useRef(x);
  useEffect(() => { actual.current = x; });
  useTeclasGlobales(useCallback((e: Tecla) => teclear(e, actual.current), []), x.caja.current);
}
