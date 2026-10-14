import { useCallback } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { api, ErrorApi } from "../../api";
import { consultas } from "../../consultas";
import { useProveedores, type Proveedor } from "../proveedores";

// Las listas de precios de los proveedores, una sola vez para el celular y la computadora
// (RNF-60): cargar la planilla, ver qué cambia, aplicarla o descartarla.
export type Salteada = { fila: number; motivo: string; contenido: string[] };
export type Resumen = { leidas: number; salteadas: number; ofertas?: number; nuevos: number; modificados: number; sin_cambio: number; dados_de_baja: number; variacion_promedio: number; salteadas_detalle?: Salteada[] };
export type ListaFila = { id: string; archivo_nombre: string; fecha_lista: string; estado: string; resumen: Resumen; avisos: string[]; importada_en: string | null; creado_en: string; proveedor_id: string; proveedor: string };
export type Cargada = { id: string; proveedor: string; fecha_lista: string; resumen: Resumen; avisos: string[]; salteadas: Salteada[] };
export type Fila = { codigo_proveedor: string; descripcion: string; marca: string | null; costo_neto: string; costo_anterior: string | null; explicacion: string[] };
export type Avance = { procesadas: number; total: number | null; etapa?: string };
export type { Proveedor };

const LISTAS = ["listas"] as const;
const listasCambiaron = () => consultas.invalidateQueries({ queryKey: LISTAS });

// Los proveedores (`null` mientras llegan) y las listas cargadas, de la más nueva a la más vieja.
export function useListas() {
  const { proveedores, error: errorProveedores, recargar: recargarProveedores } = useProveedores();
  const listas = useQuery({ queryKey: LISTAS, queryFn: () => api<ListaFila[]>("/listas") }, consultas);
  const { refetch } = listas;
  const recargar = useCallback(async () => { await Promise.all([recargarProveedores(), refetch({ cancelRefetch: false })]); }, [recargarProveedores, refetch]);
  return { proveedores, historial: listas.data ?? [], error: errorProveedores ?? listas.error, recargar };
}

export const pendientes = (historial: ListaFila[]): ListaFila[] => historial.filter((l) => l.estado === "pendiente");

// La última lista aplicada de cada proveedor.
export function ultimaAplicada(historial: ListaFila[]): Map<string, ListaFila> {
  const ultima = new Map<string, ListaFila>();
  for (const l of historial) if (l.estado === "aplicada" && !ultima.has(l.proveedor_id)) ultima.set(l.proveedor_id, l);
  return ultima;
}

// Una lista que quedó sin aplicar se retoma como si se acabara de cargar.
export const retomar = (l: ListaFila): Cargada => ({ id: l.id, proveedor: l.proveedor, fecha_lista: l.fecha_lista, resumen: l.resumen, avisos: l.avisos, salteadas: l.resumen.salteadas_detalle ?? [] });

// Cuánto cambió el costo de una fila contra el anterior, en porcentaje; `null` si es nueva.
export function variacion(f: Fila): number | null {
  const antes = Number(f.costo_anterior);
  return f.costo_anterior !== null && antes > 0 ? ((Number(f.costo_neto) - antes) / antes) * 100 : null;
}

// Manda la planilla. Si el servidor no sabe de qué proveedor es o de qué fecha, lo dice para
// preguntarlo y volver a mandarla con ese dato; cualquier otro rechazo, rechaza.
export async function cargarLista(archivo: File, extra: Record<string, string> = {}): Promise<{ cargada: Cargada } | { falta: "proveedor" | "fecha" }> {
  const cuerpo = new FormData();
  cuerpo.set("archivo", archivo, archivo.name);
  for (const [k, v] of Object.entries(extra)) cuerpo.set(k, v);
  try {
    const cargada = await api<Cargada>("/listas", { method: "POST", body: cuerpo });
    void listasCambiaron();
    return { cargada };
  } catch (e) {
    if (e instanceof ErrorApi && e.message.includes("de qué proveedor")) return { falta: "proveedor" };
    if (e instanceof ErrorApi && e.message.includes("fecha")) return { falta: "fecha" };
    throw e;
  }
}

// La vista previa de una lista, por tandas: primero lo que cambia de precio.
export function useFilasDeLista(id: string) {
  const consulta = useInfiniteQuery({
    queryKey: [...LISTAS, id, "filas"],
    queryFn: ({ pageParam }) => api<{ total: number; filas: Fila[] }>(`/listas/${id}/filas${pageParam ? `?desde=${pageParam}` : ""}`),
    initialPageParam: 0,
    getNextPageParam: (ultima, todas) => { const van = todas.reduce((n, p) => n + p.filas.length, 0); return van < ultima.total && ultima.filas.length > 0 ? van : undefined; },
  }, consultas);
  const filas = consulta.data ? consulta.data.pages.flatMap((p) => p.filas) : null;
  const { fetchNextPage, refetch } = consulta;
  // Reintentar trae lo que faltó: la primera tanda si no llegó nada, la siguiente si no.
  const traerMas = useCallback(() => { void (consulta.data ? fetchNextPage() : refetch()); }, [consulta.data, fetchNextPage, refetch]);
  return { filas, total: consulta.data?.pages.at(-1)?.total ?? 0, error: consulta.error, trayendo: consulta.isFetching, traerMas };
}

// Cuánto de la aplicación va hecho (0 a 1). Los precios llenan hasta el 90 %; lo que queda es
// la búsqueda de duplicados, que no avisa su avance.
export function fraccionAplicada(avance: Avance | null, leidas: number): number {
  if (!avance) return 0;
  if (avance.etapa === "duplicados") return 0.95;
  const total = avance.total ?? leidas;
  return (total ? avance.procesadas / total : 0) * 0.9;
}

export type FinDeAplicar = { aplicada: Resumen } | { interrumpida: string | null } | { abandonada: true };

// Aplicar corre en el servidor en segundo plano: se consulta el avance cada 800 ms hasta que
// termina, se interrumpe o quien mira se va (`sigue` da falso). Rechaza si se corta la conexión.
export async function aplicarLista(cargada: Cargada, alAvanzar: (a: Avance) => void, sigue: () => boolean = () => true): Promise<FinDeAplicar> {
  await api(`/listas/${cargada.id}/aplicar`, { method: "POST" });
  alAvanzar({ procesadas: 0, total: cargada.resumen.leidas });
  while (sigue()) {
    await new Promise((listo) => setTimeout(listo, 800));
    const l = await api<{ estado: string; resumen: Resumen & { progreso?: Avance; error?: string } }>(`/listas/${cargada.id}`);
    if (l.estado === "aplicada") { void listasCambiaron(); return { aplicada: l.resumen }; }
    if (l.estado !== "aplicando") return { interrumpida: l.resumen.error ?? null };
    if (l.resumen.progreso) alAvanzar({ procesadas: l.resumen.progreso.procesadas, total: l.resumen.progreso.total ?? cargada.resumen.leidas, etapa: l.resumen.progreso.etapa });
  }
  return { abandonada: true };
}

export async function descartarLista(id: string): Promise<void> {
  await api(`/listas/${id}/descartar`, { method: "POST" });
  void listasCambiaron();
}

// Cómo se puede leer la planilla de un proveedor (los lectores que conoce el servidor).
export function useLectores(): string[] {
  const consulta = useQuery({ queryKey: [...LISTAS, "lectores"], queryFn: () => api<string[]>("/listas/lectores"), staleTime: Infinity }, consultas);
  return consulta.data ?? [];
}
