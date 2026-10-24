import { useMutation, useQuery } from "@tanstack/react-query";
import type { CambioEntrada, CambioRegistrado, VentaDelDia, VentaParaCambio } from "@servidor/ventas";
import { api } from "../../datos/conexion";
import { consultas } from "../../datos/conexion";
import { subtotalDeRenglon } from "../precios/vista-previa";
import { ventasCambiaron } from "./ventas-del-dia";
import type { Medio } from "./venta";

// Un cambio de producto o una devolución (specs/019, historia 2): la cuenta que ve quien lo registra
// antes de confirmar, la misma que rehace el servidor (RF-129, RF-130). Lo que vuelve se toma al
// precio por unidad que se pagó (el renglón como se cobró, con su redondeo); lo que se lleva, como
// en una venta. Sin nada que se lleve, es una devolución (E18).

export type { VentaParaCambio };
export const DIAS_PARA_CAMBIAR = 15;

// Un renglón de la venta original que puede volver.
export type ParaVolver = { id: string; producto_id: string | null; descripcion: string; foto_url: string | null; unidad?: string; vendido: number; porDevolver: number; pagado: number };
export type Vuelve = { renglon: ParaVolver; cantidad: number; fallado: boolean };
export type SeLleva = { producto_id: string | null; descripcion: string; foto_url: string | null; unidad?: string; cantidad: number; precio_unitario: number; margen_aplicado: number | null; costo_neto: number | null };
export type Resolucion = "cobrado" | "devuelto" | "cuenta_corriente" | "sin_diferencia";

// Los renglones de una venta del día, con lo que queda por devolver y el precio pagado por unidad.
export function paraVolver(v: VentaDelDia): ParaVolver[] {
  return v.items.filter((i) => i.id).map((i) => {
    const vendido = Number(i.cantidad);
    return { id: i.id!, producto_id: i.producto_id ?? null, descripcion: i.descripcion, foto_url: i.foto_url, unidad: i.unidad, vendido,
      porDevolver: Math.round((vendido - Number(i.devuelto ?? 0)) * 1000) / 1000, pagado: Math.round((i.subtotal / vendido) * 100) / 100 };
  });
}
// Los de una venta encontrada al buscar (GET /ventas/para-cambio).
export const paraVolverDeLaBusqueda = (v: VentaParaCambio): ParaVolver[] =>
  v.items.map((i) => ({ id: i.id, producto_id: i.producto_id, descripcion: i.descripcion, foto_url: i.foto_url, unidad: i.unidad, vendido: Number(i.cantidad), porDevolver: i.por_devolver, pagado: i.pagado }));

export const valorQueVuelve = (vuelve: Vuelve[]): number => Math.round(vuelve.reduce((s, v) => s + v.renglon.pagado * v.cantidad, 0) * 100) / 100;
export const valorQueSeLleva = (lleva: SeLleva[]): number =>
  lleva.reduce((s, l) => s + subtotalDeRenglon({ precioUnitario: l.precio_unitario, cantidad: l.cantidad, aMano: l.margen_aplicado === null }).valor, 0);
export const diferenciaDelCambio = (vuelve: Vuelve[], lleva: SeLleva[]): number => Math.round((valorQueSeLleva(lleva) - valorQueVuelve(vuelve)) * 100) / 100;

// Si la venta original fue a cuenta corriente, la diferencia cambia la deuda; si no, se cobra o se devuelve en efectivo.
export function resolucionDelCambio(medioDeLaVenta: Medio, diferencia: number): Resolucion {
  if (medioDeLaVenta === "cuenta_corriente") return "cuenta_corriente";
  return diferencia > 0 ? "cobrado" : diferencia < 0 ? "devuelto" : "sin_diferencia";
}

// Si la venta todavía se puede cambiar: hasta 15 días después (decisión 135).
export const sePuedeCambiar = (fecha: string, ahora = Date.now()): boolean => ahora - new Date(fecha).getTime() <= DIAS_PARA_CAMBIAR * 86_400_000;

export function aEntradaDeCambio(vuelve: Vuelve[], lleva: SeLleva[], medioDiferencia: "efectivo" | "mercado_pago" | "tarjeta", medioDeLaVenta: Medio): CambioEntrada {
  const cobrado = resolucionDelCambio(medioDeLaVenta, diferenciaDelCambio(vuelve, lleva)) === "cobrado";
  return {
    vuelve: vuelve.map((v) => ({ item_id: v.renglon.id, cantidad: v.cantidad, fallado: v.fallado })),
    se_lleva: lleva.map((l) => ({ producto_id: l.producto_id, descripcion: l.descripcion, cantidad: l.cantidad, precio_unitario: l.precio_unitario, margen_aplicado: l.margen_aplicado, costo_neto: l.costo_neto })),
    ...(cobrado ? { medio_diferencia: medioDiferencia } : {}),
  };
}

// Las ventas de los últimos 15 días con un producto, para encontrar la original (E11).
export function useVentasParaCambio(buscado: string) {
  const q = buscado.trim();
  const consulta = useQuery({ queryKey: ["ventas", "para-cambio", q], queryFn: () => api<VentaParaCambio[]>(`/ventas/para-cambio?q=${encodeURIComponent(q)}`), enabled: q.length >= 2 }, consultas);
  return { ventas: q.length >= 2 ? consulta.data ?? null : [], buscando: consulta.isFetching, error: consulta.error };
}

// Registrar el cambio: rechaza con el error del servidor, o sin `estado` si no hubo conexión.
export function useRegistrarCambio() {
  const m = useMutation({
    mutationFn: ({ ventaId, entrada }: { ventaId: string; entrada: CambioEntrada }) => api<CambioRegistrado>(`/ventas/${ventaId}/cambio`, { method: "POST", body: JSON.stringify(entrada) }),
    onSuccess: ventasCambiaron,
  }, consultas);
  return { registrar: (ventaId: string, entrada: CambioEntrada) => m.mutateAsync({ ventaId, entrada }), registrando: m.isPending };
}
