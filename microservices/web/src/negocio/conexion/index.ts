import { useEffect, useState, useSyncExternalStore } from "react";
import type { Disponibilidad } from "conexion-entre-dispositivos/navegador";
import { alCambiarLaCola, enviarPendientes, guardaEnElDispositivo, leerMeta, pendientes } from "../../datos/almacenamiento";
import { avisos, conexion } from "../../datos/conexion";

export type EstadoDeLaConexion = {
  enLinea: boolean;
  // Cuántos cambios esperan para salir, y si el más viejo espera desde hace más de una hora.
  cantidad: number;
  viejo: boolean;
  ultimoEnvio: string | null;
  guardaAca: boolean;
  clase: "sin-conexion" | "atrasado" | "pendiente" | "ok";
};

export type { Disponibilidad };

// Si hay conexión con el servidor, sin preguntar nada (RF-143): lo dice el indicador de la central
// de avisos, con lo que muestran las respuestas, el navegador y el canal.
export const useConexion = (): Disponibilidad => useSyncExternalStore((o) => conexion.cambios.escuchar(o), conexion.estado);

// Lo pendiente sale al abrir, cuando vuelve la conexión (el navegador avisa o el servidor vuelve a
// contestar) y, si algo quedó sin salir (el servidor contestó con un error), con la próxima
// respuesta del servidor después de un minuto: sin reintentos a ritmo fijo (RF-144). Sin nada
// pendiente, no usa la red.
const REINTENTO_MS = 60_000;
let ultimoIntento = 0;
function mandarPendientes(ya: boolean) {
  const ahora = Date.now();
  if (!ya && ahora - ultimoIntento < REINTENTO_MS) return;
  ultimoIntento = ahora;
  enviarPendientes().catch(() => undefined);
}
function useAlConectarse() {
  const [, setTic] = useState(0);
  useEffect(() => {
    mandarPendientes(true);
    const dejarElIndicador = conexion.cambios.escuchar((e) => { if (e === "en-linea") mandarPendientes(true); });
    const dejarLasRespuestas = avisos.sucesos.escuchar((s) => { if (s === "contesto") mandarPendientes(false); });
    return () => { dejarElIndicador(); dejarLasRespuestas(); };
  }, []);
  // «Sincronizado hace…» se vuelve a escribir cada minuto, sin usar la red.
  useEffect(() => { const cada = setInterval(() => setTic((t) => t + 1), 60_000); return () => clearInterval(cada); }, []);
}

// Lo que espera en la cola: cuántos, desde cuándo y cuándo salió lo último.
function useCola() {
  const [cola, setCola] = useState<{ cantidad: number; masViejo: string | null; ultimoEnvio: string | null }>({ cantidad: 0, masViejo: null, ultimoEnvio: null });
  useEffect(() => {
    const refrescar = async () => {
      const lista = await pendientes().catch(() => []);
      const ultimoEnvio = (await leerMeta<string>("ultimo_envio").catch(() => undefined)) ?? null;
      setCola({ cantidad: lista.length, masViejo: lista[0]?.creado_en ?? null, ultimoEnvio });
    };
    void refrescar();
    return alCambiarLaCola(refrescar);
  }, []);
  return cola;
}

// Si hay conexión y cuántos cambios esperan para salir (issue #18), para el punto de las dos interfaces.
export function useEstadoDeLaConexion(): EstadoDeLaConexion {
  const enLinea = useConexion() !== "sin-conexion";
  useAlConectarse();
  const { cantidad, masViejo, ultimoEnvio } = useCola();
  const viejo = masViejo !== null && Date.now() - new Date(masViejo).getTime() > 3600_000;
  const clase = !enLinea ? "sin-conexion" : cantidad > 0 ? (viejo ? "atrasado" : "pendiente") : "ok";
  return { enLinea, cantidad, viejo, ultimoEnvio, guardaAca: guardaEnElDispositivo(), clase };
}
