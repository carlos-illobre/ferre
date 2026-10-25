import { instalarTabla } from "./motor/instalar";
import { TABLA_DE_LA_COMPU } from "./tablas/compu";
import { TABLA_DEL_CELULAR } from "./tablas/celular";

// Para las pruebas de las pantallas: las tablas de las dos interfaces, como las instala la
// aplicación (sin las flechas ni las letras con Alt, que cada prueba de teclado instala si las usa).
export function instalarLasTablasParaLasPruebas(): void {
  const enLaCompu = new Set(TABLA_DE_LA_COMPU.map((l) => `${l.tecla} ${l.accion}`));
  instalarTabla([...TABLA_DE_LA_COMPU, ...TABLA_DEL_CELULAR.filter((l) => !enLaCompu.has(`${l.tecla} ${l.accion}`))]);
}
