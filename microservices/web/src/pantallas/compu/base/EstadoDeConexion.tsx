import { haceCuantoCorto } from "../../../negocio/formato";
import { useEstadoDeLaConexion, type EstadoDeLaConexion } from "../../../negocio/conexion";

function textoDe({ enLinea, cantidad, viejo, ultimoEnvio }: EstadoDeLaConexion): string {
  const porEnviar = `${cantidad} ${cantidad === 1 ? "cambio" : "cambios"} por enviar`;
  if (!enLinea) return `Sin conexión${cantidad ? `: ${porEnviar}` : ""}`;
  if (cantidad > 0) return `${porEnviar}${viejo ? " hace más de una hora" : ""}`;
  return ultimoEnvio ? `Sincronizado ${haceCuantoCorto(ultimoEnvio)}` : "En línea · todo enviado";
}

// Un punto y pocas palabras: sin conexión y cuántos cambios esperan, o hace cuánto se sincronizó.
export function EstadoDeConexion({ testId = "conexion" }: { testId?: string }) {
  const estado = useEstadoDeLaConexion();
  return <span className={`conexion ${estado.clase}`} role="status" data-testid={testId}><i aria-hidden="true" />{textoDe(estado)}</span>;
}
