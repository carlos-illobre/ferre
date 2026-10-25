import { EVENTO_VERSION_DEL_SERVIDOR } from "../datos/conexion";

// Cuándo se busca una versión nueva (decisión 157, ADR-020): solo cuando pasa algo, nunca con un
// timer. Al volver a la vista, al volver la conexión y cuando el servidor contesta con una versión
// distinta de la que dijo antes. La primera que dice no dispara nada: al abrir ya se buscó.
// Devuelve cómo dejar de escuchar.
export function buscarVersionAlPasarAlgo(buscar: () => void): () => void {
  const siHayRed = () => { if (navigator.onLine) buscar(); };
  const alVolver = () => { if (document.visibilityState === "visible") siHayRed(); };
  let conocida: string | null = null;
  const alContestar = (e: Event) => {
    const version = (e as CustomEvent<string>).detail;
    const antes = conocida;
    conocida = version;
    if (antes !== null && antes !== version) siHayRed();
  };
  document.addEventListener("visibilitychange", alVolver);
  window.addEventListener("online", siHayRed);
  window.addEventListener(EVENTO_VERSION_DEL_SERVIDOR, alContestar);
  return () => {
    document.removeEventListener("visibilitychange", alVolver);
    window.removeEventListener("online", siHayRed);
    window.removeEventListener(EVENTO_VERSION_DEL_SERVIDOR, alContestar);
  };
}
