import { useCallback } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api, ErrorApi } from "../datos/conexion";
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

// Un fetch que no llegó al servidor no trae estado: es falta de conexión, no un error de regla.
export const esFallaDeRed = (e: unknown) => !(e instanceof ErrorApi);

export function textoDeError(e: unknown, queNoSePudo: string): string {
  if (esFallaDeRed(e)) return `${queNoSePudo}: no hay conexión con el servidor. Revisá internet y probá de nuevo.`;
  return `${queNoSePudo}: ${(e as Error).message}`;
}

export type Carga<T> = { datos: T | null; error: string | null; cargando: boolean; recargar: () => void };

// Lo que trae una consulta del servidor, con el error dicho en castellano. Cada bloque de una
// pantalla usa la suya: uno lento o caído no frena a los demás.
export function comoCarga<T>(r: { datos: T | null; error: unknown; cargando: boolean; recargar: () => void }, queNoSePudo: string): Carga<T> {
  return { datos: r.error ? null : r.datos, error: r.error ? textoDeError(r.error, queNoSePudo) : null, cargando: r.cargando, recargar: r.recargar };
}
