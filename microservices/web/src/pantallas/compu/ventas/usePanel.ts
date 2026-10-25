import { useState } from "react";
import { useRecordado } from "../../../negocio/configuracion";

// El panel de la derecha (decisión 122): se muestra u oculta y queda así la próxima vez.
export type PestanaDelPanel = "donde" | "boleta";

export function usePanel() {
  const [guardado, guardar] = useRecordado("ferre.panel", ["visible", "oculto"]);
  const visible = guardado === "visible";
  const [pestana, setPestana] = useState<PestanaDelPanel>("donde");
  const ver = (si: boolean) => guardar(si ? "visible" : "oculto");
  return { visible, ver, alternar: () => ver(!visible), pestana, setPestana };
}
export type Panel = ReturnType<typeof usePanel>;
