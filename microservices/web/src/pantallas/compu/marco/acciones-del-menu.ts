import { useComandos } from "../../../plataforma/comandos";
import { irA } from "../base/rutas";

// Lo que el menú ofrece: abrir cada pantalla por su lugar en el menú («menu.1» es la primera que se
// ve) y achicarlo o agrandarlo. Qué tecla pide cada una lo dice el teclado.
export function useAccionesDelMenu(enOrden: string[], plegar: () => void): void {
  const abrir = Object.fromEntries(enOrden.slice(0, 10).map((ruta, i) => [`menu.${i + 1}`, () => irA(ruta)]));
  useComandos({ ...abrir, "menu.plegar": plegar });
}
