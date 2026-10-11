// Navegación por hash: cada pantalla tiene dirección propia (#/vender, #/productos, …) y lo
// que se elige en la maqueta viaja en la dirección (#/vender?estado=sin-precio).
import { useMemo, useSyncExternalStore } from "react";

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

/** Va a otra pantalla. Los parámetros anteriores (también el estado de maqueta) se pierden. */
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

/** El estado de maqueta elegido con «Maqueta: ver estado». Sin elegir, es "normal". */
export function useEstadoDeMaqueta(): string {
  return useParametro("estado") ?? "normal";
}

const CONSULTA_CELULAR = "(max-width: 700px)";

function suscribirMedida(avisar: () => void) {
  const medida = window.matchMedia(CONSULTA_CELULAR);
  medida.addEventListener("change", avisar);
  return () => medida.removeEventListener("change", avisar);
}

/** `true` en el celular (hasta 700 px de ancho): el mismo corte que usan las hojas de estilo. */
export function useEsCelular(): boolean {
  return useSyncExternalStore(suscribirMedida, () => window.matchMedia(CONSULTA_CELULAR).matches);
}
