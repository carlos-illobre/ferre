import { instalarAtajos } from "./motor/atajos";
import { instalarFlechas, type DisposicionParaFlechas } from "./motor/flechas";
import { instalarTabla } from "./motor/instalar";
import { instalarDosFocos } from "./compu/dos-focos";
import { instalarFlechaAlMenu } from "./compu/flecha-al-menu";
import { instalarGrillaDeMas } from "./compu/grilla-de-mas";
import { instalarMenuYPestanas } from "./compu/menu-y-pestanas";
import { instalarFicha } from "./compu/ficha";
import { instalarGruposDeOpciones } from "./compu/grupos-de-opciones";
import { instalarFilasPropias } from "./compu/filas-propias";
import { TABLA_DE_LA_COMPU, ETIQUETAS_DE_LA_COMPU } from "./tablas/compu";
import { accionDe, etiquetar } from "../plataforma/comandos";
import type { Linea } from "./motor/tabla";

const ZONAS = ".lateral, .pestanas";
// Las letras que la tabla pide con Alt («Alt+B») para una acción que la pantalla ofrece ahora: esas
// no se reparten entre los botones.
const letrasConAlt = (tabla: readonly Linea[]) => () =>
  tabla.flatMap((l) => (accionDe(l.accion) ? /^Alt\+([A-Z])$/.exec(l.tecla)?.[1]?.toLowerCase() ?? [] : []));

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
// (decisiones 82 y 137), el menú, las pestañas y la grilla de Más; después la tabla de teclas, ←
// hacia el menú, las flechas por lo que hay en pantalla y las letras con Alt.
export function instalarTecladoDeLaCompu(): void {
  instalarDosFocos();
  instalarMenuYPestanas();
  instalarGrillaDeMas();
  instalarFicha();
  instalarGruposDeOpciones();
  instalarFilasPropias();
  // La tabla antes que «← al menú»: una pantalla que usa ← (Duplicados) se queda con la tecla.
  instalarTabla(TABLA_DE_LA_COMPU, ZONAS);
  instalarFlechaAlMenu();
  instalarFlechas(DISPOSICION, ZONAS);
  // Las flechas por las filas no son una acción de la pantalla: sus etiquetas, para las ayudas.
  etiquetar({ "filas.siguiente": "↓", "filas.anterior": "↑", ...ETIQUETAS_DE_LA_COMPU });
  instalarAtajos({ alFinal: ".lateral", ocupadas: letrasConAlt(TABLA_DE_LA_COMPU) });
}
