import { useEffect, useState } from "react";
import { leerMeta } from "../almacen";
import { alCambiarLaCola, enviarPendientes, pendientes } from "../cola";

// Indicador discreto (issue #18): un punto y dos palabras. Sin conexión y cuántos cambios
// esperan; sincronizado hace cuánto; coral si hay cambios esperando desde hace más de una hora.
export function EstadoDeConexion({ testId = "conexion" }: { testId?: string } = {}) {
  const [enLinea, setEnLinea] = useState(navigator.onLine);
  const [cantidad, setCantidad] = useState(0);
  const [masViejo, setMasViejo] = useState<string | null>(null);
  const [ultimoEnvio, setUltimoEnvio] = useState<string | null>(null);
  const [, setTic] = useState(0);

  useEffect(() => {
    const refrescar = async () => {
      const lista = await pendientes().catch(() => []);
      setCantidad(lista.length);
      setMasViejo(lista[0]?.creado_en ?? null);
      setUltimoEnvio((await leerMeta<string>("ultimo_envio").catch(() => undefined)) ?? null);
    };
    void refrescar();
    const quitar = alCambiarLaCola(refrescar);
    const alConectar = () => { setEnLinea(true); enviarPendientes().catch(() => undefined); };
    const alDesconectar = () => setEnLinea(false);
    window.addEventListener("online", alConectar);
    window.addEventListener("offline", alDesconectar);
    // Reintento periódico: el evento "online" no siempre llega tras un microcorte.
    const cada = setInterval(() => { setTic((t) => t + 1); if (navigator.onLine) enviarPendientes().catch(() => undefined); }, 60_000);
    return () => { quitar(); window.removeEventListener("online", alConectar); window.removeEventListener("offline", alDesconectar); clearInterval(cada); };
  }, []);

  const viejo = masViejo !== null && Date.now() - new Date(masViejo).getTime() > 3600_000;
  const clase = !enLinea ? "sin-conexion" : cantidad > 0 ? (viejo ? "atrasado" : "pendiente") : "ok";
  const texto = !enLinea
    ? `Sin conexión${cantidad ? ` · ${cantidad} por enviar` : ""}`
    : cantidad > 0
      ? `${cantidad} por enviar${viejo ? " desde hace más de una hora" : ""}`
      : ultimoEnvio ? `Sincronizado ${haceCuanto(ultimoEnvio)}` : "Conectado";
  return <span className={`estado-chico ${clase}`} data-testid={testId} title={texto}><i aria-hidden="true" />{texto}</span>;
}

function haceCuanto(iso: string): string {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.floor(h / 24)} días`;
}
