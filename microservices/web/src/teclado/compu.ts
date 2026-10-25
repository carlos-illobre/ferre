import { instalarAtajos, instalarFlechas, zonasConTeclasPropias, type DisposicionParaFlechas } from "../plataforma/teclado";
import { instalarTabla } from "./motor/instalar";
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

// Todo con el teclado (decisión 77): la tabla de teclas, las flechas por lo que hay en pantalla y
// las letras con Alt.
export function instalarTecladoDeLaCompu(): void {
  zonasConTeclasPropias(ZONAS);
  instalarTabla(TABLA_DE_LA_COMPU, ZONAS);
  instalarFlechas(DISPOSICION);
  instalarAtajos({ alFinal: ".lateral" });
}
