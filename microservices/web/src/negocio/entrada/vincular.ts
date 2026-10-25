import { useEffect, useState } from "react";
import { vincularConCodigo, type Vinculado } from "../vinculo";

// Se abre en el celular al leer el código QR de la computadora: con sesión, los empareja.
// `intento` vuelve a probar.
export function useVincularConCodigo<E>(codigo: string, conSesion: boolean, explicar: (e: Error) => E) {
  const [resultado, setResultado] = useState<Vinculado | null>(null);
  const [error, setError] = useState<E | null>(null);
  const [intento, setIntento] = useState(0);
  useEffect(() => {
    if (!conSesion) return;
    let vigente = true;
    setError(null);
    vincularConCodigo(codigo)
      .then((r) => { if (vigente) setResultado(r); })
      .catch((e: Error) => { if (vigente) setError(explicar(e)); });
    return () => { vigente = false; };
  }, [codigo, conSesion, intento]); // eslint-disable-line react-hooks/exhaustive-deps
  return { resultado, error, reintentar: () => setIntento((n) => n + 1) };
}
