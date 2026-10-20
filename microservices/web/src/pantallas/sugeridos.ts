import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { leerTodo } from "../almacen";
import { traerPorIds } from "../catalogo";
import type { Producto } from "./celular/pantallas/Productos";
import { precioDelProducto } from "../negocio/catalogo/precio";
import type { UltimosProductos } from "@servidor/ventas";

// Para que la venta nueva no arranque vacía (decisión 133): los productos de las últimas cuatro
// ventas, del más reciente al más viejo. Los da el servidor (aunque quien vende no pueda ver las
// ventas); sin conexión, salen de las ventas guardadas en este dispositivo.
type VentaLocal = { fecha: string; items: { producto_id: string | null }[] };
export type Sugeridos = { ultimos: Producto[] };
const CUANTOS = 4;

export const precioDe = (p: Producto): number | null => precioDelProducto(p).valor;

// `clave` vuelve a pedirlos cuando cambia (después de cobrar).
export function useSugeridos(catalogo: Producto[] | null, clave?: unknown): Sugeridos {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let vigente = true;
    (async () => {
      const delServidor = await api<UltimosProductos>("/ventas/ultimos-productos").then((r) => (Array.isArray(r?.productos) ? r.productos : null)).catch(() => null);
      const lista = delServidor ?? (await leerTodo<VentaLocal>("ventas").catch(() => [] as VentaLocal[]))
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
        .flatMap((v) => (v.items ?? []).map((i) => i.producto_id))
        .filter((id): id is string => Boolean(id));
      const unicos = [...new Set(lista)];
      // Los productos se piden al servidor si este dispositivo todavía no los trajo (specs/018).
      await traerPorIds(unicos.slice(0, 20));
      if (vigente) setIds(unicos);
    })();
    return () => { vigente = false; };
  }, [clave]);

  return useMemo(() => {
    if (!catalogo) return { ultimos: [] };
    const porId = new Map(catalogo.map((p) => [p.id, p]));
    return { ultimos: ids.map((id) => porId.get(id)).filter((p): p is Producto => Boolean(p)).slice(0, CUANTOS) };
  }, [catalogo, ids]);
}
