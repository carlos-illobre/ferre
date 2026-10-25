import { useEffect, useSyncExternalStore } from "react";
import { arrancar, elEstado, suscribirAlEstado, type EstadoDelEspejo } from "./estado";

export { avisarAlEspejo, pausarEspejo, type EstadoDelEspejo, type Lado } from "./estado";
export { alAvisoDelEspejo, avisarEnEsteDispositivo, contarAlEspejo } from "./avisos";
export { useEspejar } from "./useEspejar";

export function useEspejo(): EstadoDelEspejo & { enEspejo: boolean } {
  useEffect(arrancar, []);
  const e = useSyncExternalStore(suscribirAlEstado, elEstado);
  return { ...e, enEspejo: e.otroPresente && !e.pausado };
}
