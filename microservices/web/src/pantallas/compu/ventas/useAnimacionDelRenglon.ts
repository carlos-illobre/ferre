import { useEffect, type RefObject } from "react";
import { entra, sacudir } from "../../../plataforma/animacion";

// El renglón entra con rebote cuando se suma (o lo trae el celular) y se sacude si falta su
// precio al cobrar (decisión 134).
export function useAnimacionDelRenglon(raiz: RefObject<HTMLElement>, entrada: number, llegado: boolean, marcar: boolean) {
  useEffect(() => { if (entrada) entra(raiz.current); }, [raiz, entrada]);
  useEffect(() => { if (llegado) entra(raiz.current); }, [raiz, llegado]);
  useEffect(() => { if (marcar) sacudir(raiz.current); }, [raiz, marcar]);
}
