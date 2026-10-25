import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api, esFaltaDeRed } from "../conexion";
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
// `calculo` es la versión de la cuenta del precio con la que se bajaron: si el servidor la cambió,
// los precios guardados están hechos con la cuenta vieja y se baja todo de nuevo.
export type Descarga = { productos: string; stock: string; cuando: string; cuantos: number; calculo?: string };
export const SIN_CONEXION_PARA_BAJAR = "Sin conexión: para bajar los datos hace falta internet.";
const POR_PAGINA = 500;
// La marca del servidor es «<base>.<transacción>»: de qué base es lo bajado (022-E23).
const deQueBase = (marca: string) => marca.split(".")[0];

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

type Avance = { hechos: number; marca: string; calculo: string };

const paginaDeProductos = (desdeLaMarca: string | null, desde: string) => {
  const q = new URLSearchParams({ limite: String(POR_PAGINA), ...(desdeLaMarca ? { marca: desdeLaMarca } : {}), ...(desde ? { desde } : {}) });
  return api<DescargaDeProductos>(`/productos/descarga?${q}`);
};

// Cambió la cuenta del precio (o lo guardado no dice con cuál se hizo), o la base es otra (una
// nueva, restaurada u otro ambiente: la marca dice de cuál es, 022-E23): lo bajado no sirve, se
// baja todo desde el principio.
const yaNoSirve = (d: DescargaDeProductos, anterior: Descarga | null, desdeLaMarca: string | null) => desdeLaMarca !== null && (d.calculo !== anterior?.calculo || deQueBase(d.marca) !== deQueBase(desdeLaMarca));

async function guardarPagina(b: Avance, d: DescargaDeProductos, total: number): Promise<void> {
  b.calculo ||= d.calculo;
  // La marca de la primera página: lo que cambie mientras se baja el resto llega la próxima vez.
  b.marca ||= d.marca;
  await guardarVarios("catalogo", d.productos, d.quitados);
  b.hechos += d.productos.length + d.quitados.length;
  poner({ avance: { hechos: b.hechos, total: Math.max(total, b.hechos) } });
}

// Los productos, página por página: desde la marca de lo ya bajado si sirve; si no, todos.
async function bajarProductos(anterior: Descarga | null, total: number): Promise<Avance & { desdeLaMarca: string | null }> {
  const b: Avance = { hechos: 0, marca: "", calculo: "" };
  let desde = "";
  let desdeLaMarca = anterior?.productos ?? null;
  if (!desdeLaMarca) await reemplazarTodo("catalogo", []);
  for (;;) {
    const d = await paginaDeProductos(desdeLaMarca, desde);
    if (yaNoSirve(d, anterior, desdeLaMarca)) {
      desdeLaMarca = null; b.hechos = 0; b.marca = "";
      await reemplazarTodo("catalogo", []);
      continue;
    }
    await guardarPagina(b, d, total);
    if (!d.hay_mas || !d.siguiente) break;
    desde = d.siguiente;
  }
  return { ...b, desdeLaMarca };
}

// El stock, desde su marca si los productos se bajaron desde la suya; si no, entero. Y los clientes.
async function bajarStockYClientes(anterior: Descarga | null, desdeLaMarca: string | null): Promise<string> {
  const stock = await api<StockQueCambio>(`/stock/cambios${desdeLaMarca ? `?marca=${anterior!.stock}` : ""}`);
  const filas = Object.entries(stock.stock).map(([id, s]) => ({ id, stock: s }));
  if (desdeLaMarca) await guardarVarios("stock", filas); else await reemplazarTodo("stock", filas);
  await reemplazarTodo("clientes", await api<Cliente[]>("/clientes"));
  return stock.marca;
}

async function bajarTodo(): Promise<void> {
  poner({ error: null, avance: { hechos: 0, total: 0 } });
  const anterior = await leerDescarga();
  // La primera vez, cuántos son, para decir cuánto lleva.
  const total = anterior ? 0 : (await api<ResumenDelCatalogo>("/productos/resumen")).productos;
  poner({ avance: { hechos: 0, total } });
  const { marca, calculo, desdeLaMarca } = await bajarProductos(anterior, total);
  const marcaDelStock = await bajarStockYClientes(anterior, desdeLaMarca);
  const cuantos = (await leerTodo<{ id: string }>("catalogo")).length;
  const nueva: Descarga = { productos: marca, stock: marcaDelStock, cuando: new Date().toISOString(), cuantos, calculo };
  await guardarMeta("descarga", nueva);
  bajado = null;
  poner({ descarga: nueva, avance: null });
}

let enCurso: Promise<void> | null = null;
export function descargar(): Promise<void> {
  enCurso ??= bajarTodo()
    .catch((e) => poner({ avance: null, error: esFaltaDeRed(e) ? SIN_CONEXION_PARA_BAJAR : (e as Error).message }))
    .finally(() => { enCurso = null; });
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
  // Con la llave apagada lo bajado ya se borró (E29): no se usa lo que quedó leído en memoria.
  if (!guardaEnElDispositivo()) { bajado = null; return Promise.resolve(null); }
  bajado ??= (async () => {
    if (!(await leerDescarga())) return null;
    const [productos, stock, clientes] = await Promise.all([leerTodo<Producto>("catalogo"), leerTodo<{ id: string; stock: string }>("stock"), leerTodo<Cliente>("clientes")]);
    return { productos, stock: new Map(stock.map((s) => [s.id, Number(s.stock)])), clientes };
  })().catch(() => null);
  return bajado;
}

// Para las pruebas: como al abrir la aplicación.
export function olvidarLaDescarga() { bajado = null; enCurso = null; estado = { descarga: null, leida: false, avance: null, error: null }; }
