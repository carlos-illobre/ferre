import { haceCuantoCorto } from "../../../negocio/formato";
import { useEstadoDeLaConexion, type EstadoDeLaConexion } from "../../../negocio/conexion";

function textoDe({ enLinea, cantidad, viejo, ultimoEnvio, guardaAca }: EstadoDeLaConexion): string {
  if (!enLinea) return guardaAca ? `Sin conexión${cantidad ? ` · ${cantidad} por enviar` : ""}` : "Sin conexión · no se puede registrar nada";
  if (cantidad > 0) return `${cantidad} por enviar${viejo ? " desde hace más de una hora" : ""}`;
  return ultimoEnvio ? `Sincronizado ${haceCuantoCorto(ultimoEnvio)}` : "En línea · todo enviado";
}

// Indicador discreto (issue #18): un punto y dos palabras. Sin conexión y cuántos cambios
// esperan; sincronizado hace cuánto; coral si hay cambios esperando desde hace más de una hora.
export function EstadoDeConexion({ testId = "conexion" }: { testId?: string } = {}) {
  const estado = useEstadoDeLaConexion();
  const texto = textoDe(estado);
  return <span className={`estado-chico ${estado.clase}`} data-testid={testId} title={texto}><i aria-hidden="true" />{texto}</span>;
}
