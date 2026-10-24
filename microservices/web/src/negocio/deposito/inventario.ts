import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, esFaltaDeRed } from "../../datos/conexion";
import { loBajado } from "../../datos/almacenamiento";
import { traerPorIds, type StockFila } from "../catalogo";
import type { AjusteDeStock, Movimiento, Stock } from "@servidor/stock";
import { enviarOEncolar } from "../../datos/almacenamiento";
import { consultas } from "../../datos/conexion";
import type { Producto } from "../catalogo";
import { cantidadValida, unidadDe } from "../catalogo";

// El inventario, una sola vez para el celular y la computadora (RNF-60): cuánto hay de cada
// producto, los movimientos que lo explican y la corrección a mano, que siempre lleva motivo (RF-53).
export type { StockFila };
export type { Stock };
export type { Movimiento };

const CLAVE = ["stock"] as const;
type Traido = Stock & { delDispositivo: boolean };

// Sin conexión se muestra lo último que se vio en esta sesión o, si no se vio, lo que se bajó a mano
// para trabajar sin conexión (specs/018, historia 5): el stock de cada producto, sin su valor, que
// es del dueño y no se baja. Si el servidor contesta que no, o no hay nada, es un error (sin
// `estado` cuando fue la conexión).
async function traerStock(): Promise<Traido> {
  try {
    return { ...(await api<Stock>("/stock")), delDispositivo: false };
  } catch (e) {
    if (!esFaltaDeRed(e)) throw e;
    const visto = consultas.getQueryData<Traido>(CLAVE);
    if (visto) return { ...visto, delDispositivo: true };
    const bajado = await loBajado();
    if (!bajado) throw e;
    const proveedor = new Map(bajado.productos.map((p) => [p.id, p.proveedor ?? null]));
    const productos = [...bajado.stock].filter(([id]) => proveedor.has(id))
      .map(([id, stock]) => ({ id, stock: String(stock), proveedor: proveedor.get(id) ?? null, costo_neto: null, valor: "0", ultimo_movimiento: null }));
    return { productos, valor_total: 0, por_proveedor: {}, delDispositivo: true };
  }
}

export const stockCambio = (): Promise<void> => consultas.invalidateQueries({ queryKey: CLAVE });

export function useStock() {
  const consulta = useQuery({ queryKey: CLAVE, queryFn: traerStock }, consultas);
  const datos = consulta.data ?? null;
  const porId = useMemo(() => new Map((datos?.productos ?? []).map((s) => [s.id, s])), [datos]);
  // El catálogo está en el servidor (specs/018): se traen los productos que tienen movimientos, de a 200.
  useEffect(() => { if (datos) void traerPorIds(datos.productos.map((s) => s.id)); }, [datos]);
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
