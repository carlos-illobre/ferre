import { esperarBusqueda } from "../../../negocio/catalogo";
import { MARGENES } from "../../../negocio/precios";
import { pedir, useComandos, type Acciones } from "../../../plataforma/comandos";
import { hayUnaVentanaAbierta } from "../base/ui";
import type { EstadoDeProductos } from "./useProductos";

// Lo que Productos ofrece en la computadora: elegir en la lista y abrir la ficha, volver a la
// búsqueda (o borrarla), plegar «Así se calcula», los filtros, pedirle el lector al celular,
// agregar el elegido a la venta y fijarle el margen. Nada con una ventana o los filtros abiertos.
// Qué tecla pide cada cosa lo dice el teclado (ADR-029).

// Al abrirla, el foco va a la ficha: al margen elegido (o al primero); sin margen que elegir, a «Listo».
export function entrarALaFicha(ficha: HTMLElement | null) {
  const entrar = (f: HTMLElement | null) => {
    if (!f) return;
    const margenes = [...f.querySelectorAll<HTMLButtonElement>(".margenes button:not([disabled])")];
    (margenes.find((b) => b.getAttribute("aria-checked") === "true") ?? margenes[0] ?? f.querySelector<HTMLElement>("[data-testid='ficha-listo']"))?.focus();
  };
  // Si la ficha ya está, enseguida; si el elegido recién cambió, cuando se dibuje la suya.
  if (ficha) entrar(ficha); else requestAnimationFrame(() => entrar(document.querySelector<HTMLElement>("[data-testid='ficha-producto']")));
}

const hayVentana = (x: EstadoDeProductos) => x.viendoFiltros || hayUnaVentanaAbierta();
const enLaFicha = (x: EstadoDeProductos) => Boolean(x.ficha.current?.contains(document.activeElement));

// Si la lista todavía no alcanzó a lo que se escribió (llega un instante después de tipear), abrir
// espera la respuesta y abre el primero: no abre la fila de la lista vieja.
function abrir(x: EstadoDeProductos) {
  if (document.activeElement?.tagName === "BUTTON") return false;
  const abrirEl = (i: number) => { x.setElegido(i); entrarALaFicha(x.ficha.current); };
  if (x.consulta === x.consultaEstable && !x.lista.cargando) { if (x.lista.productos[x.elegido]) abrirEl(x.elegido); }
  else if (x.consulta.trim()) void esperarBusqueda(x.consulta).then((r) => { if (r[0]) abrirEl(0); });
  return true;
}

// Arriba de la primera fila están las pestañas: el foco vuelve a ellas (decisión 82).
function anterior(x: EstadoDeProductos) {
  if (x.elegido === 0) pedir("pestanas.enfocar");
  else x.setElegido((i) => Math.max(i - 1, 0));
}

function delElegido(x: EstadoDeProductos): Acciones {
  const p = () => x.lista.productos[x.elegido];
  const margen = (i: number) => () => {
    const elegido = p();
    if (!x.fijaMargen || !elegido) return false;
    if (elegido.costo_neto !== null) x.actualizar(elegido.id, { margen_elegido: MARGENES[i]! });
    return true;
  };
  return {
    // «+» agrega el elegido a la venta (015-E27); sin permiso de vender, no hace nada.
    "productos.agregar": () => { const elegido = p(); if (!elegido || !x.puedeVender) return false; x.agregar(elegido); return true; },
    ...Object.fromEntries(MARGENES.map((_, i) => [`productos.margen.${i + 1}`, margen(i)])),
  };
}

export function accionesDeProductos(x: EstadoDeProductos): Acciones {
  const libre = (hacer: () => boolean | void, fueraDeLaFicha = false) => () => (hayVentana(x) || (fueraDeLaFicha && enLaFicha(x)) ? false : hacer());
  const acciones: Acciones = {
    "productos.siguiente": () => x.setElegido((i) => Math.min(i + 1, x.lista.productos.length - 1)),
    "productos.anterior": () => anterior(x),
    "productos.abrir": () => abrir(x),
  };
  return {
    ...Object.fromEntries(Object.entries(acciones).map(([nombre, hacer]) => [nombre, libre(hacer!, true)])),
    "productos.volver": libre(() => { if (!enLaFicha(x)) x.setConsulta(""); x.caja.current?.focus(); }),
    "productos.calculo": libre(x.plegarCalculo),
    "productos.filtros": libre(() => x.setViendoFiltros(true)),
    "productos.lector": libre(() => { document.querySelector<HTMLButtonElement>("[data-testid='pedir-lector']")?.click(); }),
    ...Object.fromEntries(Object.entries(delElegido(x)).map(([nombre, hacer]) => [nombre, libre(hacer!)])),
  };
}

// Las mismas, para toda la pantalla y para la búsqueda.
export function useAccionesDeProductos(x: EstadoDeProductos): Acciones {
  const acciones = accionesDeProductos(x);
  useComandos(acciones);
  return acciones;
}
