// Lo que comparten «Cómo va el negocio», «Usuarios y sesiones» y «Quién hizo qué»: traer datos
// de la API con sus tres estados, decir por qué falló algo y nombrar los días.
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ErrorApi } from "../../api";
import { useConexion } from "../conexion";
import type { Tono } from "../piezas";

/** Un pedido que no llegó al servidor no trae estado: es falta de conexión, no una regla. */
export const esFallaDeRed = (e: unknown) => !(e instanceof ErrorApi);

/** Qué hacer ante un error: lo que dijo el servidor o, si no se llegó a él, revisar la conexión. */
export function motivoDe(e: unknown): string {
  return esFallaDeRed(e) ? "Revisá la conexión y probá de nuevo." : `${(e as Error).message}.`;
}

export type Carga<T> = {
  datos: T | null;
  /** Qué hacer, ya en palabras; `null` si no falló. */
  error: string | null;
  cargando: boolean;
  /** Cuándo llegaron los datos que se ven. */
  cuando: Date | null;
  recargar: () => void;
};

/**
 * Trae una ruta de la API. Cada bloque de una pantalla usa la suya: uno lento o caído no frena
 * a los demás. Vuelve a pedir sola cuando vuelve internet. Con `ruta` en `null` no pide nada.
 */
export function useCarga<T>(ruta: string | null): Carga<T> {
  const { enLinea } = useConexion();
  // `de`: a qué ruta responde lo guardado. Al cambiar de ruta, lo anterior deja de valer en el acto.
  const [estado, setEstado] = useState<Omit<Carga<T>, "recargar"> & { de: string | null }>({ datos: null, error: null, cargando: ruta !== null, cuando: null, de: ruta });
  const [vuelta, setVuelta] = useState(0);
  const recargar = useCallback(() => setVuelta((v) => v + 1), []);

  useEffect(() => {
    if (ruta === null) return;
    let vigente = true;
    setEstado((s) => (s.de === ruta ? { ...s, cargando: true } : { datos: null, error: null, cargando: true, cuando: null, de: ruta }));
    api<T>(ruta)
      .then((datos) => { if (vigente) setEstado({ datos, error: null, cargando: false, cuando: new Date(), de: ruta }); })
      // Si se cortó internet quedan a la vista los datos que había (la pantalla avisa que pueden
      // estar viejos); si el servidor contestó con un error, no: parecerían los de ahora.
      .catch((e: unknown) => { if (vigente) setEstado((s) => (esFallaDeRed(e) && s.datos !== null ? { ...s, cargando: false } : { datos: null, error: motivoDe(e), cargando: false, cuando: null, de: ruta })); });
    return () => { vigente = false; };
  }, [ruta, vuelta]);

  const antes = useRef(enLinea);
  useEffect(() => {
    if (enLinea && !antes.current) recargar();
    antes.current = enLinea;
  }, [enLinea, recargar]);

  if (estado.de !== ruta) return { datos: null, error: null, cargando: true, cuando: null, recargar };
  const { de: _de, ...carga } = estado;
  return { ...carga, recargar };
}

/** `3 ventas`, `1 venta`. */
export function cuantos(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString("es-AR")} ${n === 1 ? uno : varios}`;
}

/** "2026-10-10": el día de un momento, en hora local (lo que usa `<input type="date">`). */
export function claveDeDia(momento: Date): string {
  return `${momento.getFullYear()}-${String(momento.getMonth() + 1).padStart(2, "0")}-${String(momento.getDate()).padStart(2, "0")}`;
}

export function deClave(clave: string): Date {
  const [anio = 0, mes = 1, d = 1] = clave.split("-").map(Number);
  return new Date(anio, mes - 1, d);
}

/** «sábado 10 de octubre». */
export function diaConSemana(momento: Date): string {
  return momento.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }).replace(",", "");
}

/** «Hoy, sábado 10 de octubre», «Ayer, viernes 9 de octubre», «Jueves 8 de octubre». */
export function nombreDelDia(clave: string): string {
  const texto = diaConSemana(deClave(clave));
  const hoy = new Date();
  const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
  if (clave === claveDeDia(hoy)) return `Hoy, ${texto}`;
  if (clave === claveDeDia(ayer)) return `Ayer, ${texto}`;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** «celular · Chrome» es celular; lo demás, computadora. Así lo anota la app al entrar. */
export const esUnCelular = (dispositivo: string | null | undefined) => /celular|android|iphone/i.test(dispositivo ?? "");

// El gris queda para quien está desactivado: una persona activa nunca lo lleva.
const TONOS_DE_PERSONA: Tono[] = ["naranja", "violeta", "verde", "azul", "amarillo"];

/** El color de las iniciales de una persona, siempre el mismo para el mismo correo, en todas las pantallas. */
export function tonoDePersona(correo: string): Tono {
  let suma = 0;
  for (let i = 0; i < correo.length; i++) suma = (suma * 31 + correo.charCodeAt(i)) >>> 0;
  return TONOS_DE_PERSONA[suma % TONOS_DE_PERSONA.length]!;
}
