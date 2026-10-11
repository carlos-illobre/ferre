import { useEffect, useMemo, useState } from "react";
import { precioDeVenta } from "@ferre/calculo-de-precios";
import { api } from "../api";
import { leerTodo } from "../almacen";
import type { Producto } from "../pantallas/Productos";

// Para que la venta nueva no arranque vacía: lo último que se vendió y lo que más se vende,
// a un toque. Sale de las ventas guardadas en este dispositivo (los últimos 7 días) y de
// las ventas de hoy del servidor; sin conexión alcanza con lo del dispositivo.
type VentaLocal = { fecha: string; items: { producto_id: string | null; descripcion: string }[] };
type VentaDelDia = { fecha: string; estado: string; items: { descripcion: string }[] };
export type Sugeridos = { ultimos: Producto[]; masVendidos: Producto[]; hay: boolean };
const CUANTOS = 6;

export const precioDe = (p: Producto): number | null =>
  p.costo_neto !== null && p.margen_elegido !== null ? precioDeVenta({ costoNeto: Number(p.costo_neto), margen: p.margen_elegido, iva: Number(p.iva ?? 0.21) }).valor : null;

// `clave` vuelve a calcular cuando cambia (después de cobrar).
export function useSugeridos(catalogo: Producto[] | null, clave?: unknown): Sugeridos {
  const [renglones, setRenglones] = useState<{ fecha: string; id: string | null; descripcion: string }[]>([]);
  useEffect(() => {
    let vigente = true;
    (async () => {
      const locales = await leerTodo<VentaLocal>("ventas").catch(() => [] as VentaLocal[]);
      const deHoy = await api<{ ventas: VentaDelDia[] }>("/ventas").then((d) => d.ventas.filter((v) => v.estado !== "anulada")).catch(() => [] as VentaDelDia[]);
      if (!vigente) return;
      setRenglones([
        ...locales.flatMap((v) => (v.items ?? []).map((i) => ({ fecha: v.fecha, id: i.producto_id, descripcion: i.descripcion }))),
        ...deHoy.flatMap((v) => v.items.map((i) => ({ fecha: v.fecha, id: null, descripcion: i.descripcion }))),
      ]);
    })();
    return () => { vigente = false; };
  }, [clave]);

  return useMemo(() => {
    if (!catalogo || renglones.length === 0) return { ultimos: [], masVendidos: [], hay: false };
    const porId = new Map(catalogo.map((p) => [p.id, p]));
    const porNombre = new Map(catalogo.map((p) => [p.descripcion, p]));
    const veces = new Map<string, number>();
    const ultimaVez = new Map<string, string>();
    for (const r of renglones) {
      const p = (r.id ? porId.get(r.id) : undefined) ?? porNombre.get(r.descripcion);
      if (!p) continue;
      veces.set(p.id, (veces.get(p.id) ?? 0) + 1);
      if ((ultimaVez.get(p.id) ?? "") < r.fecha) ultimaVez.set(p.id, r.fecha);
    }
    const ordenar = (m: Map<string, number | string>) => [...m.entries()].sort((a, b) => (a[1] < b[1] ? 1 : a[1] > b[1] ? -1 : 0)).slice(0, CUANTOS).map(([id]) => porId.get(id)!);
    const ultimos = ordenar(ultimaVez);
    // Con pocas ventas las dos listas salen iguales: ahí alcanza con la primera.
    const ranking = ordenar(veces);
    const masVendidos = ranking.every((p) => ultimos.includes(p)) ? [] : ranking;
    return { ultimos, masVendidos, hay: ultimos.length > 0 };
  }, [catalogo, renglones]);
}
