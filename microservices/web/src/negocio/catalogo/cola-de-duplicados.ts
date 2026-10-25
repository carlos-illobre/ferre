import { useCallback, useState } from "react";
import { ErrorApi } from "../../datos/conexion";
import type { Lado, Sugerencia } from "./duplicados";

// La cola de sugerencias de duplicados, igual en el celular y la computadora: cuál está elegida,
// qué lado se conserva en cada una y cuál es la más barata.

// Un texto para comparar sin importar mayúsculas, tildes ni espacios de más.
export const plano = (t: string | null) => (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// El lado más barato, si los dos tienen costo y no es el mismo.
export function masBaratoDe(s: Sugerencia): Lado | null {
  if (!s.a.costo_neto || !s.b.costo_neto) return null;
  const a = Number(s.a.costo_neto), b = Number(s.b.costo_neto);
  return a === b ? null : a < b ? "a" : "b";
}

// Cuánto más caro (en %, redondeado) es un lado que el otro.
export function cuantoMasCaro(s: Sugerencia, lado: Lado): number {
  const este = Number(s[lado].costo_neto), otro = Number(s[lado === "a" ? "b" : "a"].costo_neto);
  return Math.round(((este - otro) / otro) * 100);
}

// Cuántas sugerencias llegaron cada uno de los últimos siete días, del más viejo a hoy.
export function barrasDeLaSemana(sugerencias: Sugerencia[]): number[] {
  return Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(); dia.setHours(0, 0, 0, 0); dia.setDate(dia.getDate() - (6 - i));
    return sugerencias.filter((s) => new Date(s.creado_en).setHours(0, 0, 0, 0) === dia.getTime()).length;
  });
}

// La sugerencia elegida de la cola (la primera si no hay otra) y qué lado se conserva de cada una.
export function useColaDeDuplicados(cola: Sugerencia[]) {
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [conservados, setConservados] = useState<Record<string, Lado>>({});
  const posicion = Math.max(0, cola.findIndex((s) => s.id === elegidaId));
  const actual = cola[posicion] ?? null;
  const mover = useCallback((paso: number) => {
    if (!cola.length) return;
    setElegidaId(cola[(posicion + paso + cola.length) % cola.length]!.id);
  }, [cola, posicion]);
  // La que queda elegida cuando se resuelve la actual: la que ocupa su lugar.
  const laQueSigue = () => cola[posicion + 1] ?? cola[posicion - 1] ?? null;
  const conservar = (s: Sugerencia): Lado => conservados[s.id] ?? "a";
  const elegirLado = (s: Sugerencia, lado: Lado) => setConservados((c) => ({ ...c, [s.id]: lado }));
  return { posicion, actual, setElegidaId, mover, laQueSigue, conservar, elegirLado };
}

// Qué decir si unir, separar o buscar no se pudo: lo que dijo el servidor o que falta internet.
export const mensajeDeDuplicados = (e: unknown) => (e instanceof ErrorApi ? e.message : "Sin conexión con el servidor. Unir, separar y buscar duplicados necesitan internet.");
