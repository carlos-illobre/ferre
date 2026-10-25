// Una central de prueba: con un `fetch` que guarda cada pedido, un reloj a mano, una página que se
// puede ocultar y una red que se puede cortar.
import { crearCentral } from "../navegador/central.js";
import { fetchDePrueba, relojDePrueba } from "./red.js";
import { vistaDePrueba } from "./vista.js";

export function centralDePrueba() {
  const red = fetchDePrueba();
  const reloj = relojDePrueba();
  const vista = vistaDePrueba();
  let alCambiarLaRed: (enLinea: boolean) => void = () => {};
  const central = crearCentral({
    url: "/canal",
    cabeceras: () => ({ Authorization: "Bearer t" }),
    entorno: { fetch: red.fetch, esperar: reloj.esperar, vista, red: { alCambiar: (o) => { alCambiarLaRed = o; return () => {}; } } },
  });
  return { central, red, reloj, vista, cambiarLaRed: (enLinea: boolean) => alCambiarLaRed(enLinea) };
}

// Los GET (aperturas del canal) que se hicieron, con los temas que pidió cada uno.
export const aperturas = (red: ReturnType<typeof fetchDePrueba>) =>
  red.pedidos.filter((p) => p.metodo === "GET").map((p) => JSON.parse(p.cabeceras["X-Temas"]!) as unknown);
