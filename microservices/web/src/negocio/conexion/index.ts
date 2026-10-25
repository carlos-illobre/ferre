import { useEffect, useState } from "react";
import { alCambiarLaCola, enviarPendientes, guardaEnElDispositivo, leerMeta, pendientes } from "../../datos/almacenamiento";

export type EstadoDeLaConexion = {
  enLinea: boolean;
  // Cuántos cambios esperan para salir, y si el más viejo espera desde hace más de una hora.
  cantidad: number;
  viejo: boolean;
  ultimoEnvio: string | null;
  guardaAca: boolean;
  clase: "sin-conexion" | "atrasado" | "pendiente" | "ok";
};

function useAlConectarse(setEnLinea: (v: boolean) => void) {
  const [, setTic] = useState(0);
  useEffect(() => {
    const alConectar = () => { setEnLinea(true); enviarPendientes().catch(() => undefined); };
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    // Reintento periódico: el evento "online" no siempre llega tras un microcorte.
    const cada = setInterval(() => { setTic((t) => t + 1); if (navigator.onLine) enviarPendientes().catch(() => undefined); }, 60_000);
    return () => { window.removeEventListener("online", alConectar); window.removeEventListener("offline", alDesconectar); clearInterval(cada); };
  }, [setEnLinea]);
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
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  useAlConectarse(setEnLinea);
  const { cantidad, masViejo, ultimoEnvio } = useCola();
  const viejo = masViejo !== null && Date.now() - new Date(masViejo).getTime() > 3600_000;
  const clase = !enLinea ? "sin-conexion" : cantidad > 0 ? (viejo ? "atrasado" : "pendiente") : "ok";
  return { enLinea, cantidad, viejo, ultimoEnvio, guardaAca: guardaEnElDispositivo(), clase };
}
