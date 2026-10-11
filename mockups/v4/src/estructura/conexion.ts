import { useAlmacen } from "../almacen";
import { useEstadoDeMaqueta } from "../ruta";

/**
 * El estado de la conexión, uno solo para toda la app. En la maqueta se queda «sin conexión»
 * cuando el estado elegido es `sin-conexion` o termina en `-sin-conexion`.
 */
export function useConexion(): { enLinea: boolean; porEnviar: number } {
  const estado = useEstadoDeMaqueta();
  const porEnviar = useAlmacen((a) => a.porEnviar);
  const enLinea = !(estado === "sin-conexion" || estado.endsWith("-sin-conexion"));
  return { enLinea, porEnviar };
}
