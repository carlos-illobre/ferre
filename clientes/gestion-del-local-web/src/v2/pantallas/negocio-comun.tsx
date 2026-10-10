import { useCallback, useEffect, useState } from "react";
import { api, ErrorApi } from "../../api";

// Lo que comparten la entrada y las pantallas de Negocio: saber si hay conexión, traer
// datos con sus tres estados (cargando, error, listo) y decir los errores en castellano.

export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => navigator.onLine);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener("online", si);
    window.addEventListener("offline", no);
    return () => { window.removeEventListener("online", si); window.removeEventListener("offline", no); };
  }, []);
  return enLinea;
}

// Un fetch que no llegó al servidor no trae estado: es falta de conexión, no un error de regla.
export const esFallaDeRed = (e: unknown) => !(e instanceof ErrorApi);

export function textoDeError(e: unknown, queNoSePudo: string): string {
  if (esFallaDeRed(e)) return `${queNoSePudo}: no hay conexión con el servidor. Revisá internet y probá de nuevo.`;
  return `${queNoSePudo}: ${(e as Error).message}`;
}

export type Carga<T> = { datos: T | null; error: string | null; cargando: boolean; recargar: () => void };

// Trae una ruta de la API. Cada bloque de una pantalla usa la suya: uno lento o caído no
// frena a los demás. Vuelve a pedir solo cuando vuelve la conexión.
export function useCarga<T>(ruta: string, queNoSePudo: string): Carga<T> {
  const [estado, setEstado] = useState<{ datos: T | null; error: string | null; cargando: boolean }>({ datos: null, error: null, cargando: true });
  const [vuelta, setVuelta] = useState(0);
  const recargar = useCallback(() => setVuelta((v) => v + 1), []);
  useEffect(() => {
    let vigente = true;
    setEstado((s) => ({ ...s, cargando: true }));
    api<T>(ruta)
      .then((datos) => { if (vigente) setEstado({ datos, error: null, cargando: false }); })
      // Con error no quedan a la vista los datos de antes: parecerían los de ahora.
      .catch((e: unknown) => { if (vigente) setEstado({ datos: null, error: textoDeError(e, queNoSePudo), cargando: false }); });
    return () => { vigente = false; };
  }, [ruta, queNoSePudo, vuelta]);
  useEffect(() => {
    window.addEventListener("online", recargar);
    return () => window.removeEventListener("online", recargar);
  }, [recargar]);
  return { ...estado, recargar };
}

// Día y hora como se dicen en el mostrador: «hoy 10:40», «ayer 18:05», «03/10 09:12».
export function diaYHora(iso: string): string {
  const d = new Date(iso);
  const hora = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
  const hoy = new Date();
  const dias = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86_400_000);
  if (dias === 0) return `hoy ${hora}`;
  if (dias === 1) return `ayer ${hora}`;
  return `${d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", ...(d.getFullYear() === hoy.getFullYear() ? {} : { year: "numeric" }) })} ${hora}`;
}

export const fechaCompleta = (iso: string) => new Date(iso).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

// Los roles de la API con los nombres que se usan en el negocio.
export const ROLES: { valor: string; nombre: string }[] = [
  { valor: "admin", nombre: "Administrador" },
  { valor: "dueño", nombre: "Administrador principal" },
  { valor: "mostrador", nombre: "Vendedor y comprador" },
];
export const nombreDeRol = (rol: string) => ROLES.find((r) => r.valor === rol)?.nombre ?? rol;

// Ícono que falta en lo compartido: una computadora, para distinguirla del celular.
export function IconoCompu({ tam = 20 }: { tam?: number }) {
  return (
    <svg width={tam} height={tam} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 5h16v11H4zM2 20h20M9 16v4M15 16v4" />
    </svg>
  );
}
