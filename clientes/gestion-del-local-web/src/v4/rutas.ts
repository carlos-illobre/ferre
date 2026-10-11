// Navegación por hash: cada pantalla tiene dirección propia (#/vender, #/productos, …). El
// cliente se publica como archivos estáticos y una ruta real daría 404 al recargar.
import { useMemo, useSyncExternalStore } from "react";
import type { NombreDeIcono } from "./piezas/Icono";

export type Parametros = Record<string, string | undefined | null>;

function suscribir(avisar: () => void) {
  window.addEventListener("hashchange", avisar);
  return () => window.removeEventListener("hashchange", avisar);
}

function partir(hash: string): { camino: string; parametros: URLSearchParams } {
  const limpio = hash.replace(/^#/, "");
  const corte = limpio.indexOf("?");
  const camino = (corte === -1 ? limpio : limpio.slice(0, corte)).replace(/^\/+|\/+$/g, "");
  return { camino, parametros: new URLSearchParams(corte === -1 ? "" : limpio.slice(corte + 1)) };
}

/** Arma una dirección para usar en `href`: `enlace("stock", { producto: "p1" })` → `#/stock?producto=p1`. */
export function enlace(camino: string, parametros: Parametros = {}): string {
  const consulta = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) if (valor) consulta.set(clave, valor);
  const texto = consulta.toString();
  return `#/${camino.replace(/^\/+/, "")}${texto ? `?${texto}` : ""}`;
}

/** Va a otra pantalla. Los parámetros anteriores se pierden. */
export function ir(camino: string, parametros: Parametros = {}): void {
  window.location.hash = enlace(camino, parametros);
  window.scrollTo(0, 0);
}

/** Cambia un parámetro de la dirección sin salir de la pantalla (`null` lo saca). No suma historial. */
export function cambiarParametro(clave: string, valor: string | null): void {
  const { camino, parametros } = partir(window.location.hash);
  const nuevos: Parametros = Object.fromEntries(parametros.entries());
  nuevos[clave] = valor;
  window.history.replaceState(null, "", enlace(camino, nuevos));
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** La pantalla actual (`camino`, sin barra: "vender") y sus parámetros. */
export function useRuta(): { camino: string; parametros: URLSearchParams } {
  const hash = useSyncExternalStore(suscribir, () => window.location.hash);
  return useMemo(() => partir(hash), [hash]);
}

/** Un parámetro de la dirección, o `null` si no está. */
export function useParametro(clave: string): string | null {
  return useRuta().parametros.get(clave);
}

const CONSULTA_CELULAR = "(max-width: 700px)";
const hayMedidas = () => typeof window.matchMedia === "function";

function suscribirMedida(avisar: () => void) {
  if (!hayMedidas()) return () => undefined;
  const medida = window.matchMedia(CONSULTA_CELULAR);
  medida.addEventListener("change", avisar);
  return () => medida.removeEventListener("change", avisar);
}

/** `true` en el celular (hasta 700 px de ancho): el mismo corte que usan las hojas de estilo. */
export function useEsCelular(): boolean {
  return useSyncExternalStore(suscribirMedida, () => hayMedidas() && window.matchMedia(CONSULTA_CELULAR).matches);
}

// ---------------------------------------------------------------- Destinos

// Los cinco principales (menú lateral y barra de pestañas) y los que cuelgan de «Más».
export type Destino = {
  camino: string;
  nombre: string;
  /** Nombre corto para la barra de pestañas del celular. */
  corto?: string;
  icono: NombreDeIcono;
};

export type DestinoDeMas = Destino & { detalle: string };

export const PRINCIPALES: Destino[] = [
  { camino: "vender", nombre: "Vender", icono: "vender" },
  { camino: "ventas", nombre: "Ventas del día", corto: "Ventas", icono: "ventas" },
  { camino: "productos", nombre: "Productos", icono: "productos" },
  { camino: "recibir", nombre: "Recibir mercadería", corto: "Recibir", icono: "recibir" },
  { camino: "mas", nombre: "Más", icono: "menu" },
];

export const DE_MAS: DestinoDeMas[] = [
  { camino: "listas", nombre: "Listas de precios", detalle: "Actualizá los costos con la planilla del proveedor", icono: "listas" },
  { camino: "duplicados", nombre: "Duplicados", detalle: "Uní los productos que están cargados dos veces", icono: "duplicados" },
  { camino: "stock", nombre: "Stock", detalle: "Cuánto hay de cada producto y qué se movió", icono: "stock" },
  { camino: "contar", nombre: "Contar stock", detalle: "Contá una estantería con el celular", icono: "contar" },
  { camino: "negocio", nombre: "Cómo va el negocio", detalle: "Lo vendido, lo comprado y lo que no llevaron", icono: "negocio" },
  { camino: "usuarios", nombre: "Usuarios y sesiones", detalle: "Quién puede entrar y desde dónde", icono: "usuarios" },
  { camino: "actividad", nombre: "Quién hizo qué", detalle: "Todo lo que pasó, en orden", icono: "actividad" },
];

/** `true` si la pantalla cuelga de «Más» (entonces «Más» queda marcado y hay «Volver a Más»). */
export function esDeMas(camino: string): boolean {
  return DE_MAS.some((d) => d.camino === camino);
}

/** Qué destino principal queda marcado para una pantalla. */
export function principalDe(camino: string): string {
  return esDeMas(camino) ? "mas" : camino;
}
