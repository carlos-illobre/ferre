import { useEffect, useState } from "react";
import "./version-nueva.css";

// Cuando se publica una versión nueva con la app abierta, se avisa y se ofrece actualizar. No
// se recarga sola a mitad del trabajo: una venta a medio armar se perdería. Al abrir la app sí
// se actualiza sola (ver actualizacion.ts). El aviso llega por un evento de la ventana.
export const EVENTO_VERSION_NUEVA = "ferre:version-nueva";
export type AvisoDeVersion = CustomEvent<{ actualizar: () => void }>;

export function VersionNueva() {
  const [actualizar, setActualizar] = useState<(() => void) | null>(null);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    const alAvisar = (e: Event) => setActualizar(() => (e as AvisoDeVersion).detail.actualizar);
    window.addEventListener(EVENTO_VERSION_NUEVA, alAvisar);
    return () => window.removeEventListener(EVENTO_VERSION_NUEVA, alAvisar);
  }, []);
  if (!actualizar) return null;
  return (
    <div className="version-nueva" role="status" data-testid="version-nueva">
      <span>Hay una versión nueva de Ferrebress.</span>
      <button type="button" disabled={ocupado} onClick={() => { setOcupado(true); actualizar(); }} data-testid="actualizar-app">{ocupado ? "Actualizando…" : "Actualizar ahora"}</button>
    </div>
  );
}
