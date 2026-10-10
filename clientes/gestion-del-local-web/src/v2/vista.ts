import { useEffect, useState } from "react";

// Una sola interfaz que se acomoda al ancho, sin recargar: por debajo de 900 px es el
// celular (barra de abajo, tarjetas, hojas que suben); desde 900 px, la computadora (menú
// lateral, tablas, teclado). Las pantallas preguntan acá cuando el marcado cambia, y no
// solo los estilos: una tarjeta para el pulgar no es una fila para el teclado.
export const CONSULTA_CELULAR = "(max-width: 899px)";

export function useEsCelular(): boolean {
  const [es, setEs] = useState(() => typeof matchMedia === "function" && matchMedia(CONSULTA_CELULAR).matches);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const consulta = matchMedia(CONSULTA_CELULAR);
    const alCambiar = () => setEs(consulta.matches);
    alCambiar();
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);
  return es;
}
