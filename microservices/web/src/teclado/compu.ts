import { zonasConTeclasPropias } from "../plataforma/teclado";
import { instalarAtajos } from "./motor/atajos";
import { instalarFlechas, type DisposicionParaFlechas } from "./motor/flechas";
import { instalarTabla } from "./motor/instalar";
import { instalarDosFocos } from "./compu/dos-focos";
import { instalarFlechaAlMenu } from "./compu/flecha-al-menu";
import { instalarGrillaDeMas } from "./compu/grilla-de-mas";
import { instalarMenuYPestanas } from "./compu/menu-y-pestanas";
import { TABLA_DE_LA_COMPU } from "./tablas/compu";

const ZONAS = ".lateral, .pestanas";

// La disposición de la interfaz de la computadora, para las flechas: el menú de la izquierda, las
// pestañas y las opciones de Más se recorren por su cuenta.
const DISPOSICION: DisposicionParaFlechas = {
  pantalla: ".cuerpo",
  noSonListas: ".lateral, .pestanas, .mas-grilla",
  noSonCajas: ".pestanas",
  sinCaja: () => document.getElementById("contenido"),
  arribaDeLaLista: () => document.querySelector<HTMLElement>(".cuerpo .pestanas button[aria-current='page']"),
};

// Todo con el teclado (decisión 77). Primero lo que va por la forma de la pantalla: los dos focos
// (decisiones 82 y 137), el menú, las pestañas y la grilla de Más, y ← hacia el menú; después la
// tabla de teclas, las flechas por lo que hay en pantalla y las letras con Alt.
export function instalarTecladoDeLaCompu(): void {
  instalarDosFocos();
  instalarMenuYPestanas();
  instalarGrillaDeMas();
  instalarFlechaAlMenu();
  zonasConTeclasPropias(ZONAS);
  instalarTabla(TABLA_DE_LA_COMPU, ZONAS);
  instalarFlechas(DISPOSICION);
  instalarAtajos({ alFinal: ".lateral" });
}
