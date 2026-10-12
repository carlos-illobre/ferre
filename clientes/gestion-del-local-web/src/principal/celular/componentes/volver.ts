import { useEffect, useRef } from "react";

// El botón de volver del celular (el triángulo de Android) cierra lo que está abierto encima
// de la pantalla (la cámara del escáner, la ficha de un producto, cualquier hoja) en vez de
// cambiar de pantalla o salir de la aplicación. Al abrirse, lo de encima anota un paso en el
// historial del navegador; «volver» deshace ese paso y eso lo cierra. Si se cierra de otra
// forma (su propio botón), el paso se saca para no dejarlo colgado.
// Con varias cosas apiladas (la ficha y, encima, la cámara), cada «volver» cierra la de arriba.
// La dirección no cambia: las rutas de la app (que van por el hash) no se enteran.
type Encima = { cerrar: () => void; porVolver: boolean };
const pila: Encima[] = [];
let porIgnorar = 0; // pasos que sacamos nosotros: su aviso no es un «volver» de la persona
let escuchando = false;

function alVolver() {
  if (porIgnorar > 0) { porIgnorar--; return; }
  const arriba = pila.pop();
  if (arriba) { arriba.porVolver = true; arriba.cerrar(); }
}

export function useVolverCierra(alCerrar: () => void): void {
  const cerrar = useRef(alCerrar);
  useEffect(() => { cerrar.current = alCerrar; }, [alCerrar]);
  useEffect(() => {
    if (!escuchando) { window.addEventListener("popstate", alVolver); escuchando = true; }
    const yo: Encima = { cerrar: () => cerrar.current(), porVolver: false };
    const direccion = location.hash;
    // El paso se anota un instante después de abrir: si lo de encima se desmonta enseguida
    // (React lo hace a propósito en desarrollo), no queda ningún paso que deshacer.
    let anotado = false;
    const espera = setTimeout(() => { history.pushState({ ...(history.state as object | null), encima: true }, ""); pila.push(yo); anotado = true; }, 0);
    return () => {
      clearTimeout(espera);
      const i = pila.indexOf(yo);
      if (i >= 0) pila.splice(i, 1);
      // Si se cerró porque la app fue a otra pantalla, el paso ya quedó atrás: deshacerlo
      // desharía ese cambio de pantalla.
      if (anotado && !yo.porVolver && location.hash === direccion && (history.state as { encima?: boolean } | null)?.encima) { porIgnorar++; history.back(); }
    };
  }, []);
}
