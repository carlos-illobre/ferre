import { etiquetar } from "../plataforma/comandos";
import { instalarTabla } from "./motor/instalar";
import { ETIQUETAS_DEL_CELULAR, TABLA_DEL_CELULAR } from "./tablas/celular";

export function instalarTecladoDelCelular(): void {
  instalarTabla(TABLA_DEL_CELULAR);
  etiquetar(ETIQUETAS_DEL_CELULAR);
}
