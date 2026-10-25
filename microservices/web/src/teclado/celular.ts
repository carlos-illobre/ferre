import { instalarTabla } from "./motor/instalar";
import { TABLA_DEL_CELULAR } from "./tablas/celular";

export function instalarTecladoDelCelular(): void {
  instalarTabla(TABLA_DEL_CELULAR);
}
