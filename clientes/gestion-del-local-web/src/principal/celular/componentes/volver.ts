import { useEffect, useRef } from "react";

// El botón de volver del celular (el triángulo de Android) cierra lo que está abierto encima
// de la pantalla, en vez de salir de la aplicación. Al abrirse, lo de encima anota un paso en
// el historial del navegador; «volver» deshace ese paso y eso lo cierra. Si se cierra de otra
// forma (su propio botón), el paso se saca para no dejarlo colgado.
// La dirección no cambia: las rutas de la app (que van por el hash) no se enteran.
let porIgnorar = 0; // pasos que sacamos nosotros: su aviso no es un «volver» de la persona

export function useVolverCierra(alCerrar: () => void): void {
  const cerrar = useRef(alCerrar);
  useEffect(() => { cerrar.current = alCerrar; }, [alCerrar]);
  useEffect(() => {
    let cerradoPorVolver = false;
    // El paso se anota un instante después de abrir: si lo de encima se desmonta enseguida
    // (React lo hace a propósito en desarrollo), no queda ningún paso que deshacer.
    let anotado = false;
    const espera = setTimeout(() => { history.pushState({ ...(history.state as object | null), encima: true }, ""); anotado = true; }, 0);
    const alVolver = () => {
      if (porIgnorar > 0) { porIgnorar--; return; }
      cerradoPorVolver = true;
      cerrar.current();
    };
    window.addEventListener("popstate", alVolver);
    return () => {
      window.removeEventListener("popstate", alVolver);
      clearTimeout(espera);
      if (anotado && !cerradoPorVolver && (history.state as { encima?: boolean } | null)?.encima) { porIgnorar++; history.back(); }
    };
  }, []);
}
