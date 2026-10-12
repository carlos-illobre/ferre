import { registerSW } from "virtual:pwa-register";
import { EVENTO_VERSION_NUEVA } from "./VersionNueva";

// Cómo se actualiza la app instalada. El navegador solo busca una versión nueva cuando la app
// se carga, y un celular puede tenerla abierta en segundo plano durante días: por eso se busca
// también cada vez que vuelve a primer plano y cada media hora.
// Cuando aparece una versión nueva: si la app se acaba de abrir, se actualiza sola (todavía
// no hay nada a medio hacer); si ya se estaba usando, se avisa y la persona elige cuándo.
const RECIEN_ABIERTA_MS = 15_000;
const CADA_MS = 30 * 60 * 1000;

export function mantenerActualizada(): void {
  const abierta = Date.now();
  const actualizar = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (Date.now() - abierta < RECIEN_ABIERTA_MS) { void actualizar(true); return; }
      window.dispatchEvent(new CustomEvent(EVENTO_VERSION_NUEVA, { detail: { actualizar: () => void actualizar(true) } }));
    },
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      const buscar = () => { if (navigator.onLine) registro.update().catch(() => undefined); };
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") buscar(); });
      window.addEventListener("online", buscar);
      setInterval(buscar, CADA_MS);
    },
  });
}
