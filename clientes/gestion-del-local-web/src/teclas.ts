import { useEffect } from "react";

// Atajos de teclado que funcionan aunque la caja de búsqueda no tenga el foco: flechas
// para moverse por los resultados, Shift+1..5 para el margen. Se ignoran cuando el foco
// está en otro campo de texto o selector (ahí las flechas tienen su propio sentido), ni
// cuando está en el menú lateral o en las pestañas de una parte.
//
// Todas las pantallas comparten un solo oyente, para que el orden sea siempre el mismo:
// primero lo propio de la pantalla y, si la pantalla no usó la tecla, lo general de la
// aplicación (`usarTeclasPorDefecto`: moverse con las flechas por lo que hay en pantalla).
type Manejador = { manejar: (e: KeyboardEvent) => void; excepto: HTMLElement | null };
const deLasPantallas = new Set<Manejador>();
let porDefecto: ((e: KeyboardEvent) => void) | null = null;
let escuchando = false;

function alTeclear(e: KeyboardEvent) {
  const objetivo = e.target as HTMLElement | null;
  // Con el foco en el menú o en las pestañas, las flechas son para recorrerlos: no mueven
  // también la lista de la pantalla.
  if (e.defaultPrevented || objetivo?.closest?.(".lateral, .pestanas")) return;
  const enCampo = Boolean(objetivo && (objetivo.tagName === "INPUT" || objetivo.tagName === "SELECT" || objetivo.tagName === "TEXTAREA" || objetivo.isContentEditable));
  for (const m of [...deLasPantallas]) { if (!enCampo || objetivo === m.excepto) m.manejar(e); }
  if (!e.defaultPrevented) porDefecto?.(e);
}
function escuchar() { if (!escuchando && typeof window !== "undefined") { window.addEventListener("keydown", alTeclear); escuchando = true; } }

export function useTeclasGlobales(manejar: (e: KeyboardEvent) => void, excepto?: HTMLElement | null) {
  useEffect(() => {
    escuchar();
    const m: Manejador = { manejar, excepto: excepto ?? null };
    deLasPantallas.add(m);
    return () => { deLasPantallas.delete(m); };
  }, [manejar, excepto]);
}

// Lo que hace una tecla cuando la pantalla no la usó. Lo fija la aplicación de la computadora.
export function usarTeclasPorDefecto(manejar: ((e: KeyboardEvent) => void) | null): void {
  escuchar();
  porDefecto = manejar;
}
