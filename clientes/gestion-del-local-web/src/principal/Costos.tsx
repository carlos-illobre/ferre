import type { ReactNode } from "react";
import { usePuede } from "./permisos";

// Los costos (lo que cobra cada proveedor, y las explicaciones que lo dejan ver) se muestran
// solo a quien tiene el permiso «Ver costos» (RF-72, decisión 53). Igual en las dos interfaces.
export const useVeCostos = () => usePuede()("catalogo.costos");
export function SiVeCostos({ children }: { children: ReactNode }) {
  return useVeCostos() ? <>{children}</> : null;
}
