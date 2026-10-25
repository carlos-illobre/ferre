import { etiquetar } from "../plataforma/comandos";
import { instalarTabla } from "./motor/instalar";
import { instalarFicha } from "./compu/ficha";
import { instalarGruposDeOpciones } from "./compu/grupos-de-opciones";
import { TABLA_DE_LA_COMPU, ETIQUETAS_DE_LA_COMPU } from "./tablas/compu";
import { ETIQUETAS_DEL_CELULAR, TABLA_DEL_CELULAR } from "./tablas/celular";

// Para las pruebas de las pantallas: las tablas de las dos interfaces, como las instala la
// aplicación, y lo que va por la forma de una pieza (la ficha, los grupos de opciones). Sin las
// flechas por las filas ni las letras con Alt, que cada prueba de teclado instala si las usa.
export function instalarLasTablasParaLasPruebas(): void {
  instalarFicha();
  instalarGruposDeOpciones();
  etiquetar({ "filas.siguiente": "↓", "filas.anterior": "↑", ...ETIQUETAS_DE_LA_COMPU });
  const enLaCompu = new Set(TABLA_DE_LA_COMPU.map((l) => `${l.tecla} ${l.accion}`));
  instalarTabla([...TABLA_DE_LA_COMPU, ...TABLA_DEL_CELULAR.filter((l) => !enLaCompu.has(`${l.tecla} ${l.accion}`))]);
  etiquetar(ETIQUETAS_DEL_CELULAR);
}
