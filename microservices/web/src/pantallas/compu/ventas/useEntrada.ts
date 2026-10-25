import { useCallback, useState } from "react";
import { loQueEntro, ventaActual } from "../../../negocio/ventas";

// Lo que se suma entra con un rebote y el borde verde: un renglón nuevo o uno al que le subió la
// cantidad. `n` cambia en cada entrada, para que el mismo renglón pueda volver a rebotar.
export function useEntrada() {
  const [entrada, setEntrada] = useState({ clave: "", n: 0 });
  const conEntrada = useCallback((agregarAlgo: () => unknown) => {
    const antes = ventaActual().items;
    agregarAlgo();
    const sumado = loQueEntro(antes, ventaActual().items)[0];
    if (sumado) setEntrada((e) => ({ clave: sumado.clave, n: e.n + 1 }));
  }, []);
  return { entrada, conEntrada };
}
