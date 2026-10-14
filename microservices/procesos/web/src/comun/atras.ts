import { useEffect, useRef } from "react";

// El botón de volver del celular (el triángulo de Android) cierra lo que está abierto encima
// (un menú, una hoja, una ventana) en vez de salir de la pantalla. Al abrirse, lo de encima anota
// un paso en el historial del navegador; «volver» deshace ese paso y eso lo cierra. Si se cierra
// de otra forma, el paso se saca para no dejarlo colgado. Con varias cosas apiladas, cada «volver»
// cierra la de arriba. La dirección no cambia, así que las rutas de la aplicación no se enteran.
// Es propio del módulo (ADR-019): no depende de cómo navega la aplicación que lo usa.

type Encima = { cerrar: () => void; porVolver: boolean };
const pila: Encima[] = [];
let porIgnorar = 0;
let escuchando = false;

function alVolver() {
  if (porIgnorar > 0) { porIgnorar--; return; }
  const arriba = pila.pop();
  if (arriba) { arriba.porVolver = true; arriba.cerrar(); }
}

export function useAtrasCierra(alCerrar: () => void): void {
  const cerrar = useRef(alCerrar);
  useEffect(() => { cerrar.current = alCerrar; }, [alCerrar]);
  useEffect(() => {
    if (!escuchando) { window.addEventListener("popstate", alVolver); escuchando = true; }
    const yo: Encima = { cerrar: () => cerrar.current(), porVolver: false };
    const direccion = location.href;
    // Un instante después de abrir: si se desmonta enseguida, no queda ningún paso que deshacer.
    let anotado = false;
    const espera = setTimeout(() => { history.pushState({ ...(history.state as object | null), procesosEncima: true }, ""); pila.push(yo); anotado = true; }, 0);
    return () => {
      clearTimeout(espera);
      const i = pila.indexOf(yo);
      if (i >= 0) pila.splice(i, 1);
      if (anotado && !yo.porVolver && location.href === direccion && (history.state as { procesosEncima?: boolean } | null)?.procesosEncima) { porIgnorar++; history.back(); }
    };
  }, []);
}
