import { useEffect, useRef } from "react";

// Una tabla de qué tecla hace qué. Si lo que hace devuelve `false`, la tecla no era para eso y
// sigue su camino; si no, se la consume.
export type TablaDeTeclas = Partial<Record<string, () => boolean | void>>;
type Tecla = { key: string; altKey: boolean; ctrlKey: boolean; metaKey: boolean; preventDefault: () => void };

// Para el onKeyDown de un elemento, o para cualquier oyente de teclas.
export function teclearCon(tabla: TablaDeTeclas, e: Tecla): void {
  const hacer = tabla[e.key];
  if (hacer && hacer() !== false) e.preventDefault();
}

// La tabla para toda la ventana, mientras está activa. Una tecla con Alt, Ctrl o Cmd no es de la tabla.
export function useTablaDeTeclas(tabla: TablaDeTeclas, activa = true): void {
  const actual = useRef({ tabla, activa });
  useEffect(() => { actual.current = { tabla, activa }; });
  useEffect(() => {
    const alApretar = (e: KeyboardEvent) => {
      if (actual.current.activa && !e.altKey && !e.ctrlKey && !e.metaKey) teclearCon(actual.current.tabla, e);
    };
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, []);
}
