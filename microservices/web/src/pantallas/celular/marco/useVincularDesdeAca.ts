import { useCallback, useState } from "react";
import { destinoDelCodigo } from "../../../negocio/entrada";
import { irA } from "../rutas";

// Vincular con la computadora sin salir de la aplicación: la cámara se abre acá adentro y lee
// el código que la computadora muestra en «Vincular el celular» (o en su entrada).
export function useVincularDesdeAca() {
  const [escaneando, setEscaneando] = useState(false);
  const [errorDeCodigo, setErrorDeCodigo] = useState<string | null>(null);
  const alLeerCodigo = useCallback((leido: string) => {
    const destino = destinoDelCodigo(leido);
    if (destino) irA(destino.replace(/^#\//, "")); else setErrorDeCodigo("Ese código no es de Ferrebress. Apuntá al que muestra la computadora al tocar «Vincular el celular».");
  }, []);
  const escanear = () => { setErrorDeCodigo(null); setEscaneando(true); };
  return { escaneando, errorDeCodigo, alLeerCodigo, escanear, dejarDeEscanear: () => setEscaneando(false) };
}
export type VincularDesdeAca = ReturnType<typeof useVincularDesdeAca>;
