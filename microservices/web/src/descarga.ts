import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api, ErrorApi } from "./api";
import { guardarMeta, guardarVarios, leerMeta, leerTodo, reemplazarTodo } from "./almacen";
import { guardaEnElDispositivo } from "./guardado";
import type { Producto } from "./producto";
import type { DescargaDeProductos, ResumenDelCatalogo } from "@servidor/productos";
import type { StockQueCambio } from "@servidor/stock";
import type { Cliente } from "@servidor/clientes";

// La descarga a mano para trabajar sin conexión (specs/018, historia 5). Nada se baja solo: con
// «Trabajar sin conexión» habilitado, «Descargar» baja lo que usan quien vende y quien compra (los
// productos con su precio, costos y proveedores, el stock y los clientes) y lo guarda en el
// dispositivo. «Actualizar» baja solo lo que cambió desde la descarga anterior: lo dice la marca
// que dio el servidor, no el reloj de este dispositivo. Lo bajado se usa solo sin conexión.
export type Descarga = { productos: string; stock: string; cuando: string; cuantos: number };
export const SIN_CONEXION_PARA_BAJAR = "Sin conexión: para bajar los datos hace falta internet.";
const POR_PAGINA = 500;

type Estado = { descarga: Descarga | null; leida: boolean; avance: { hechos: number; total: number } | null; error: string | null };
let estado: Estado = { descarga: null, leida: false, avance: null, error: null };
const oyentes = new Set<() => void>();
function poner(cambios: Partial<Estado>) { estado = { ...estado, ...cambios }; oyentes.forEach((o) => o()); }
const suscribir = (o: () => void) => { oyentes.add(o); return () => { oyentes.delete(o); }; };

async function leerDescarga(): Promise<Descarga | null> {
  if (!guardaEnElDispositivo()) return null;
  const d = (await leerMeta<Descarga>("descarga").catch(() => undefined)) ?? null;
  if (!estado.leida || estado.descarga?.cuando !== d?.cuando) poner({ descarga: d, leida: true });
  return d;
}

// ---------- Bajar ----------

let enCurso: Promise<void> | null = null;
export function descargar(): Promise<void> {
  enCurso ??= (async () => {
    poner({ error: null, avance: { hechos: 0, total: 0 } });
    try {
      const anterior = await leerDescarga();
      // La primera vez, cuántos son, para decir cuánto lleva.
      const total = anterior ? 0 : (await api<ResumenDelCatalogo>("/productos/resumen")).productos;
      poner({ avance: { hechos: 0, total } });
      let hechos = 0, marca = "", desde = "";
      if (!anterior) await reemplazarTodo("catalogo", []);
      for (;;) {
        const q = new URLSearchParams({ limite: String(POR_PAGINA), ...(anterior ? { marca: anterior.productos } : {}), ...(desde ? { desde } : {}) });
        const d = await api<DescargaDeProductos>(`/productos/descarga?${q}`);
        // La marca de la primera página: lo que cambie mientras se baja el resto llega la próxima vez.
        marca ||= d.marca;
        await guardarVarios("catalogo", d.productos, d.quitados);
        hechos += d.productos.length + d.quitados.length;
        poner({ avance: { hechos, total: Math.max(total, hechos) } });
        if (!d.hay_mas || !d.siguiente) break;
        desde = d.siguiente;
      }
      const stock = await api<StockQueCambio>(`/stock/cambios${anterior ? `?marca=${anterior.stock}` : ""}`);
      const filas = Object.entries(stock.stock).map(([id, s]) => ({ id, stock: s }));
      if (anterior) await guardarVarios("stock", filas); else await reemplazarTodo("stock", filas);
      await reemplazarTodo("clientes", await api<Cliente[]>("/clientes"));
      const cuantos = (await leerTodo<{ id: string }>("catalogo")).length;
      const nueva: Descarga = { productos: marca, stock: stock.marca, cuando: new Date().toISOString(), cuantos };
      await guardarMeta("descarga", nueva);
      bajado = null;
      poner({ descarga: nueva, avance: null });
    } catch (e) {
      poner({ avance: null, error: e instanceof ErrorApi ? e.message : SIN_CONEXION_PARA_BAJAR });
    } finally { enCurso = null; }
  })();
  return enCurso;
}

// La fila de Configuración: si hay algo bajado, cuándo y cuántos; si se está bajando, cuánto lleva.
export function useDescarga() {
  const e = useSyncExternalStore(suscribir, () => estado);
  useEffect(() => { void leerDescarga(); }, []);
  return { descarga: e.descarga, leida: e.leida, avance: e.avance, error: e.error, descargar: useCallback(() => void descargar(), []) };
}

// ---------- Usar lo bajado, sin conexión ----------

export type Bajado = { productos: Producto[]; stock: Map<string, number>; clientes: Cliente[] };
let bajado: Promise<Bajado | null> | null = null;
// Lo bajado, leído una vez del dispositivo; null si no se bajó nada.
export function loBajado(): Promise<Bajado | null> {
  bajado ??= (async () => {
    if (!(await leerDescarga())) return null;
    const [productos, stock, clientes] = await Promise.all([leerTodo<Producto>("catalogo"), leerTodo<{ id: string; stock: string }>("stock"), leerTodo<Cliente>("clientes")]);
    return { productos, stock: new Map(stock.map((s) => [s.id, Number(s.stock)])), clientes };
  })().catch(() => null);
  return bajado;
}

// Para las pruebas: como al abrir la aplicación.
export function olvidarLaDescarga() { bajado = null; enCurso = null; estado = { descarga: null, leida: false, avance: null, error: null }; }
