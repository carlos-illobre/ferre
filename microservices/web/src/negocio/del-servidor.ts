import { useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../datos/conexion";
import { consultas } from "../datos/conexion";

// Lo que pide una pantalla a una ruta del servidor: los datos (`null` mientras no llegaron),
// el error si lo hubo, si está pidiendo y cómo volver a pedir. Con error no quedan a la vista
// los datos de antes: parecerían los de ahora. Al volver la conexión se pide solo.
// Con `mantenerAnterior`, al cambiar de clave (otra página) se sigue viendo lo anterior hasta que llega lo nuevo.
export function useDelServidor<T>(clave: readonly unknown[], ruta: string, { activo = true, mantenerAnterior = false } = {}) {
  const consulta = useQuery({ queryKey: clave, queryFn: () => api<T>(ruta), enabled: activo, refetchOnReconnect: true, placeholderData: mantenerAnterior ? keepPreviousData : undefined }, consultas);
  const { refetch } = consulta;
  const recargar = useCallback(() => { void refetch({ cancelRefetch: false }); }, [refetch]);
  return { datos: consulta.error ? null : consulta.data ?? null, error: consulta.error, cargando: consulta.isFetching, recargar };
}
