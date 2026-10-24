import { useCallback, useEffect, useState } from "react";
import { api, esFaltaDeRed } from "../../datos/conexion";
import type { AjustesDelSistema, CambiosDeAjustes } from "@servidor/sistema";

// Más → Sistema (specs/020): lo que vale para todos los dispositivos. Los tramos y lo que vale los
// decide el servidor; acá se piden, se cambian (se guarda al tocar) y se dice qué quedó.
export type { AjustesDelSistema };
export const DIAS_MIN = 1;
export const DIAS_MAX = 365;

// Un tramo como se lee en el botón («No», «30 s», «1 min») y en la frase de lo guardado.
export const nombreDelTramo = (s: number): string => (s === 0 ? "No" : s < 60 ? `${s} s` : `${s / 60} min`);
const largo = (s: number): string => (s < 60 ? `${s} segundos` : s === 60 ? "1 minuto" : `${s / 60} minutos`);
export function queQuedo(cambios: CambiosDeAjustes): string {
  if (cambios.sesion_segundos !== undefined) return cambios.sesion_segundos === 0 ? "la sesión no se recuerda" : `la sesión se recuerda ${largo(cambios.sesion_segundos)}`;
  return `el vínculo dura ${cambios.vinculo_dias} ${cambios.vinculo_dias === 1 ? "día" : "días"}`;
}
export const diasValidos = (texto: string): number | null => {
  const n = Number(texto.trim());
  return Number.isInteger(n) && n >= DIAS_MIN && n <= DIAS_MAX ? n : null;
};

// Lo último que se vio, para mostrarlo si se vuelve a la pantalla sin conexión.
let ultimos: AjustesDelSistema | null = null;

export function useAjustesDelSistema() {
  const [ajustes, setAjustes] = useState<AjustesDelSistema | null>(ultimos);
  const [sinConexion, setSinConexion] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState<string | null>(null);
  const traer = useCallback(() => {
    api<AjustesDelSistema>("/sistema/ajustes")
      .then((a) => { ultimos = a; setAjustes(a); setSinConexion(false); })
      .catch((e: unknown) => { if (esFaltaDeRed(e)) setSinConexion(true); else setError((e as Error).message); });
  }, []);
  useEffect(() => {
    traer();
    const sin = () => setSinConexion(true);
    window.addEventListener("offline", sin);
    window.addEventListener("online", traer);
    return () => { window.removeEventListener("offline", sin); window.removeEventListener("online", traer); };
  }, [traer]);

  const cambiar = useCallback(async (cambios: CambiosDeAjustes) => {
    if (!ajustes || sinConexion) return;
    const antes = ajustes;
    setAjustes({ ...ajustes, ...cambios }); setGuardado(null); setError(null);
    try {
      const r = await api<AjustesDelSistema>("/sistema/ajustes", { method: "PUT", body: JSON.stringify(cambios) });
      ultimos = r; setAjustes(r); setGuardado(queQuedo(cambios));
    } catch (e) {
      setAjustes(antes);
      if (esFaltaDeRed(e)) setSinConexion(true); else setError((e as Error).message);
    }
  }, [ajustes, sinConexion]);

  return { ajustes, sinConexion, error, guardado, cambiar, cerrarError: () => setError(null) };
}

// Para las pruebas: como al abrir la aplicación.
export function olvidarAjustesVistos() { ultimos = null; }
