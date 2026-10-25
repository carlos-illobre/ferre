import { useState } from "react";

// El panel de la derecha (decisión 122): se muestra u oculta con F1 y queda así la próxima vez.
const GUARDADO = "ferre.panel";
const leer = () => { try { return localStorage.getItem(GUARDADO) !== "oculto"; } catch { return true; } };
const guardar = (si: boolean) => { try { localStorage.setItem(GUARDADO, si ? "visible" : "oculto"); } catch { /* sin almacenamiento */ } };
export type PestanaDelPanel = "donde" | "boleta";

export function usePanel() {
  const [visible, setVisible] = useState(leer);
  const [pestana, setPestana] = useState<PestanaDelPanel>("donde");
  const ver = (si: boolean) => { setVisible(si); guardar(si); };
  return { visible, ver, alternar: () => ver(!visible), pestana, setPestana };
}
export type Panel = ReturnType<typeof usePanel>;
