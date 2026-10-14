import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiDelLienzo } from "../editor/Lienzo";
import type { Grafo } from "../modelo/grafo";
import type { Procesos } from "../estado";
import { exportarBpmn, exportarPng, leerArchivo } from "./exportar";
import { avisoDeLoQueNoSeVe, loQueNoSeVe } from "../modelo/noSeVe";

// Lo que comparten las dos interfaces alrededor del dibujo: el grafo al día para la tabla y la
// lista, el paso elegido, el guardado medio segundo después del último cambio (E10), importar y
// exportar.

const VACIO: Grafo = { pasos: [], flechas: [], carriles: [] };

/** `corto`: los avisos con los textos del celular. */
export function useDibujo(procesos: Procesos, corto = false) {
  const lienzo = useRef<ApiDelLienzo>(null);
  const [grafo, setGrafo] = useState<Grafo>(VACIO);
  const [elegido, setElegido] = useState<string | null>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abiertoId = procesos.abierto?.id ?? null;
  const guardarBorrador = procesos.guardarBorrador;

  const leerGrafo = useCallback(() => {
    if (lienzo.current) setGrafo(lienzo.current.grafo());
  }, []);

  const alCambiar = useCallback(() => {
    leerGrafo();
    if (!abiertoId) return;
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(async () => {
      if (!lienzo.current) return;
      guardarBorrador(abiertoId, await lienzo.current.xml());
    }, 500);
  }, [abiertoId, guardarBorrador, leerGrafo]);

  useEffect(() => () => { if (espera.current) clearTimeout(espera.current); }, []);
  useEffect(() => { setElegido(null); }, [abiertoId]);

  const exportar = useCallback(async (como: "png" | "bpmn", nombre: string, estado: string) => {
    if (!lienzo.current) return;
    try {
      if (como === "bpmn") exportarBpmn(await lienzo.current.xml(), nombre);
      else await exportarPng(await lienzo.current.svg(), nombre, estado);
    } catch (e) {
      procesos.avisar(e instanceof Error ? e.message : "No se pudo exportar");
    }
  }, [procesos]);

  /** E35, E36: lo que no se puede leer se dice acá; si es BPMN, lo dice el servicio. Lo que trae
   *  y acá no se ve se avisa después de importarlo. */
  const importar = useCallback(async (archivo: File) => {
    const leido = await leerArchivo(archivo);
    if ("error" in leido) {
      procesos.avisar(leido.error);
      return;
    }
    const usados = new Set((procesos.lista ?? []).map((p) => p.nombre.toLocaleLowerCase("es")));
    let nombre = leido.nombre.slice(0, 110);
    for (let n = 2; usados.has(nombre.toLocaleLowerCase("es")); n++) nombre = `${leido.nombre.slice(0, 110)} (${n})`;
    if (!(await procesos.crear(nombre, leido.texto))) return;
    const aviso = avisoDeLoQueNoSeVe(loQueNoSeVe(leido.texto), corto);
    if (aviso) procesos.avisar(aviso);
  }, [procesos, corto]);

  const pasoElegido = elegido ? grafo.pasos.find((p) => p.id === elegido) ?? null : null;
  return { lienzo, grafo, elegido, setElegido, pasoElegido, alCambiar, alCargar: leerGrafo, exportar, importar };
}
