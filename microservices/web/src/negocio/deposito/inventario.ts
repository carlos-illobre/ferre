import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ErrorApi } from "../../api";
import { leerTodo } from "../../almacen";
import { traerPorIds, type StockFila } from "../../catalogo";
import type { AjusteDeStock, Movimiento, Stock } from "@servidor/stock";
import { enviarOEncolar } from "../../cola";
import { consultas } from "../../consultas";
import type { Producto } from "../../producto";
import { cantidadValida, unidadDe } from "../../unidades";

// El inventario, una sola vez para el celular y la computadora (RNF-60): cuánto hay de cada
// producto, los movimientos que lo explican y la corrección a mano, que siempre lleva motivo (RF-53).
export type { StockFila };
export type { Stock };
export type { Movimiento };

const CLAVE = ["stock"] as const;
type Traido = Stock & { delDispositivo: boolean };

// Lo guardado en el dispositivo trae las filas pero no los totales: se rearman acá.
function armar(filas: StockFila[]): Stock {
  const por_proveedor: Stock["por_proveedor"] = {};
  for (const f of filas) {
    const g = (por_proveedor[f.proveedor ?? "Sin proveedor"] ??= { unidades: 0, valor: 0, productos: 0 });
    g.unidades += Math.max(0, Number(f.stock)); g.valor += Number(f.valor); g.productos += 1;
  }
  return { productos: filas, valor_total: filas.reduce((s, f) => s + Number(f.valor), 0), por_proveedor };
}

// Sin conexión se muestra lo último que se vio o lo que bajó este dispositivo; si el servidor
// contesta que no, o no hay nada guardado, es un error (sin `estado` cuando fue la conexión).
async function traerStock(): Promise<Traido> {
  try {
    return { ...(await api<Stock>("/stock")), delDispositivo: false };
  } catch (e) {
    if (e instanceof ErrorApi) throw e;
    const visto = consultas.getQueryData<Traido>(CLAVE);
    if (visto) return { ...visto, delDispositivo: true };
    const guardado = await leerTodo<StockFila>("stock").catch(() => [] as StockFila[]);
    if (guardado.length === 0) throw e;
    return { ...armar(guardado), delDispositivo: true };
  }
}

export const stockCambio = (): Promise<void> => consultas.invalidateQueries({ queryKey: CLAVE });

export function useStock() {
  const consulta = useQuery({ queryKey: CLAVE, queryFn: traerStock }, consultas);
  const datos = consulta.data ?? null;
  const porId = useMemo(() => new Map((datos?.productos ?? []).map((s) => [s.id, s])), [datos]);
  // Buscando en el servidor (RF-85) no está el catálogo en memoria: se traen los primeros productos con stock.
  useEffect(() => { if (datos) void traerPorIds(datos.productos.slice(0, 150).map((s) => s.id)); }, [datos]);
  const { refetch } = consulta;
  const recargar = useCallback(() => { void refetch({ cancelRefetch: false }); }, [refetch]);
  return { datos, porId, delDispositivo: datos?.delDispositivo ?? false, error: consulta.error, recargar };
}

// Los productos que tienen algún movimiento, por nombre: lo que se muestra cuando no se busca nada.
export const productosConStock = (catalogo: Producto[], porId: Map<string, StockFila>): Producto[] =>
  catalogo.filter((p) => porId.has(p.id)).sort((a, b) => a.descripcion.localeCompare(b.descripcion, "es"));

export const nombreDeMovimiento = (m: Movimiento): string => (m.tipo === "venta" ? "Venta" : m.tipo === "compra" ? "Compra" : m.referencia_tipo === "conteo" ? "Conteo" : "Ajuste");

// Los movimientos de un producto; se piden recién cuando hacen falta (`activo`).
export function useMovimientos(productoId: string, activo = true) {
  const consulta = useQuery({ queryKey: [...CLAVE, productoId, "movimientos"], queryFn: () => api<Movimiento[]>(`/stock/${productoId}/movimientos`), enabled: activo }, consultas);
  return { movimientos: consulta.data ?? null, error: consulta.error };
}

// Lo tipeado en «¿Cuántas hay?»: un número, cero o más, con los decimales que admite la unidad. Si no vale, NaN.
export function cantidadContada(tipeado: string, producto: Producto): number {
  const texto = tipeado.trim().replace(",", ".");
  const n = texto === "" ? NaN : Number(texto);
  if (!Number.isFinite(n) || n < 0) return NaN;
  return n === 0 ? 0 : cantidadValida(texto, unidadDe(producto));
}

export type FaltaAlCorregir = { real: boolean; motivo: boolean };
export type Correccion = { hay: number; encolado: boolean };

// Corregir el stock de un producto. Sin conexión queda guardado en el dispositivo y se manda solo.
export function useCorregirStock(producto: Producto) {
  const [guardando, setGuardando] = useState(false);
  const faltaEn = (real: string, motivo: string): FaltaAlCorregir | null => {
    const falta = { real: Number.isNaN(cantidadContada(real, producto)), motivo: !motivo.trim() };
    return falta.real || falta.motivo ? falta : null;
  };
  // Rechaza si no se pudo guardar ni en el servidor ni en el dispositivo. Hay que validar antes con `faltaEn`.
  async function corregir(real: string, motivo: string): Promise<Correccion> {
    const hay = cantidadContada(real, producto);
    setGuardando(true);
    try {
      const { encolado } = await enviarOEncolar("stock.ajuste", "POST", `/stock/${producto.id}/ajustes`, { cantidad_real: hay, motivo: motivo.trim() } satisfies AjusteDeStock);
      if (!encolado) await stockCambio();
      return { hay, encolado };
    } finally {
      setGuardando(false);
    }
  }
  return { faltaEn, corregir, guardando };
}
