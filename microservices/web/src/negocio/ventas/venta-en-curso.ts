import { useSyncExternalStore } from "react";
import type { MedioDePago } from "@servidor/ventas";
import type { Producto } from "../catalogo";
import { unidadDe, type Unidad } from "../catalogo";
import { EVENTO_SESION_TERMINADA } from "../../datos/sesion";

// La venta en curso: los renglones, cómo se paga y el cliente, mientras la aplicación está
// abierta (ADR-022). No es de ninguna pantalla: Vender la muestra y la cambia, el Catálogo le
// agrega productos (RF-108) y el menú cuenta cuántos lleva. Ir a otra parte no la pierde;
// recargar la aplicación, sí. El espejo se engancha en `venta-en-espejo.ts`.
export type Item = {
  clave: string; producto: Producto | null; descripcion: string; cantidad: number;
  unidad: Unidad; // por unidades enteras o por kilo, metro o litro (con un decimal)
  precioManual: number | null; // precio tipeado para esta venta; pisa al margen y no se guarda en el producto
  abierto: boolean; // el margen y el precio a mano desplegados (lo decide la pantalla)
};
type VentaEnCurso = { items: Item[]; medio: MedioDePago | null; clienteId: string };

export const MEDIO_DE_ARRANQUE: MedioDePago = "efectivo"; // lo más común, y muestra que los medios se tocan
const VACIA: VentaEnCurso = { items: [], medio: MEDIO_DE_ARRANQUE, clienteId: "" };

let venta: VentaEnCurso = VACIA;
const oyentes = new Set<() => void>();
export function cambiarVenta(cambio: Partial<VentaEnCurso>) { venta = { ...venta, ...cambio }; oyentes.forEach((o) => o()); }

export const ventaActual = (): VentaEnCurso => venta;
export function useVentaEnCurso(): VentaEnCurso {
  return useSyncExternalStore((o) => { oyentes.add(o); return () => { oyentes.delete(o); }; }, () => venta);
}
type Valor<T> = T | ((previo: T) => T);
export const ponerItems = (valor: Valor<Item[]>) => cambiarVenta({ items: typeof valor === "function" ? valor(venta.items) : valor });
export const ponerMedio = (medio: MedioDePago | null) => cambiarVenta({ medio });
export const ponerCliente = (clienteId: string) => cambiarVenta({ clienteId });
export const vaciarVenta = () => cambiarVenta(VACIA);
// La venta a medio armar es de quien la estaba armando: al terminar su sesión no queda para el
// que entre después (015, ADR-022).
if (typeof window !== "undefined") window.addEventListener(EVENTO_SESION_TERMINADA, vaciarVenta);

// Agregar un producto (o un ítem libre, con su descripción): entra con cantidad 1; si el
// producto ya está, se le suma 1 al renglón que había. La misma regla en Vender y en el Catálogo.
export function agregarALaVenta(p: Producto | null, descripcionLibre?: string): void {
  ponerItems((lista) => {
    if (p) {
      const ya = lista.find((it) => it.producto?.id === p.id);
      if (ya) return lista.map((it) => (it === ya ? { ...it, cantidad: it.cantidad + 1 } : it));
      return [...lista, { clave: crypto.randomUUID(), producto: p, descripcion: p.descripcion, cantidad: 1, unidad: unidadDe(p), precioManual: null, abierto: p.margen_elegido === null }];
    }
    return [...lista, { clave: crypto.randomUUID(), producto: null, descripcion: descripcionLibre ?? "", cantidad: 1, unidad: "unidad", precioManual: null, abierto: false }];
  });
}
