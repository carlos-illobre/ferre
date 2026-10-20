import { useMutation } from "@tanstack/react-query";
import type { CorreccionEntrada, VentaCorregida, VentaDelDia } from "@servidor/ventas";
import { api } from "../../api";
import { consultas } from "../../consultas";
import { subtotalDeRenglon } from "../precios/vista-previa";
import { ventasCambiaron } from "./ventas-del-dia";
import type { Medio } from "./venta";

// Corregir una venta (specs/019, historia 1): la cuenta que ve quien corrige antes de guardar, la
// misma que rehace el servidor (RF-127, E02, E31). Un renglón con margen se redondea como al
// venderlo; uno a mano (sin margen, o con el precio cambiado ahora) se cobra tal cual (RF-19).

export type RenglonCorregido = {
  id?: string; // sin id, un producto agregado al corregir
  producto_id: string | null;
  descripcion: string;
  foto_url: string | null;
  unidad?: string; // la del producto, para mostrarla al lado de la cantidad
  cantidad: number;
  precio_unitario: number;
  margen_aplicado: number | null;
  costo_neto?: number | null;
  devuelto: number; // lo que ya volvió por un cambio: la cantidad no baja de ahí
  antes: { cantidad: number; precio_unitario: number } | null; // null: agregado ahora
};
export type Correccion = { renglones: RenglonCorregido[]; quitados: RenglonCorregido[]; medio: Medio; clienteId: string | null };
export type Resolucion = "cobrada" | "devuelta" | "cuenta_corriente" | "sin_diferencia";

export function empezarCorreccion(v: VentaDelDia): Correccion {
  return {
    renglones: v.items.map((i) => ({
      id: i.id, producto_id: i.producto_id ?? null, descripcion: i.descripcion, foto_url: i.foto_url, unidad: i.unidad, cantidad: Number(i.cantidad), precio_unitario: Number(i.precio_unitario),
      margen_aplicado: i.margen_aplicado === null ? null : Number(i.margen_aplicado), devuelto: Number(i.devuelto ?? 0), antes: { cantidad: Number(i.cantidad), precio_unitario: Number(i.precio_unitario) },
    })),
    quitados: [],
    medio: v.medio_pago as Medio,
    clienteId: v.cliente_id ?? null,
  };
}

export const subtotalCorregido = (r: Pick<RenglonCorregido, "cantidad" | "precio_unitario" | "margen_aplicado">): number =>
  subtotalDeRenglon({ precioUnitario: r.precio_unitario, cantidad: r.cantidad, aMano: r.margen_aplicado === null }).valor;
export const totalCorregido = (c: Correccion): number => Math.round(c.renglones.reduce((s, r) => s + subtotalCorregido(r), 0) * 100) / 100;
export const diferenciaDe = (v: VentaDelDia, c: Correccion): number => Math.round((totalCorregido(c) - Number(v.total)) * 100) / 100;

// Cómo se resuelve la diferencia: en cuenta corriente cambia la deuda; si no, se cobra o se devuelve en efectivo.
export function resolucionDe(medio: Medio, diferencia: number): Resolucion {
  if (medio === "cuenta_corriente") return "cuenta_corriente";
  return diferencia > 0 ? "cobrada" : diferencia < 0 ? "devuelta" : "sin_diferencia";
}

// Si algo cambió: un renglón, uno quitado o agregado, el medio o el cliente.
export function hayCambios(v: VentaDelDia, c: Correccion): boolean {
  return c.quitados.length > 0 || c.medio !== v.medio_pago || (c.clienteId ?? null) !== (v.cliente_id ?? null)
    || c.renglones.some((r) => !r.antes || r.antes.cantidad !== r.cantidad || r.antes.precio_unitario !== r.precio_unitario);
}

// Cambiar el precio lo deja a mano: se cobra tal cual, sin el redondeo del margen.
export const conPrecio = (r: RenglonCorregido, precio: number): RenglonCorregido =>
  ({ ...r, precio_unitario: precio, margen_aplicado: r.antes && precio === r.antes.precio_unitario ? r.margen_aplicado : null });
// Una cantidad nunca baja de lo que ya volvió por un cambio.
export const conCantidad = (r: RenglonCorregido, cantidad: number): RenglonCorregido => ({ ...r, cantidad: Math.max(cantidad, r.devuelto, 0.001) });

export function quitar(c: Correccion, i: number): Correccion {
  const r = c.renglones[i];
  if (!r || r.devuelto > 0) return c;
  return { ...c, renglones: c.renglones.filter((_, j) => j !== i), quitados: r.id ? [...c.quitados, r] : c.quitados };
}

// Lo que no se puede guardar, en palabras; null si se puede.
export function porQueNoSeGuarda(v: VentaDelDia, c: Correccion): string | null {
  if (c.renglones.length === 0) return "Para dejar la venta sin productos, se anula.";
  if (c.medio === "cuenta_corriente" && !c.clienteId) return "Elegí el cliente de la cuenta corriente.";
  if (!hayCambios(v, c)) return "Todavía no cambiaste nada.";
  return null;
}

export function aEntrada(v: VentaDelDia, c: Correccion, medioDiferencia: "efectivo" | "mercado_pago" | "tarjeta"): CorreccionEntrada {
  const diferencia = diferenciaDe(v, c);
  return {
    version: v.version ?? "",
    medio_pago: c.medio,
    cliente_id: c.clienteId,
    ...(resolucionDe(c.medio, diferencia) === "cobrada" ? { medio_diferencia: medioDiferencia } : {}),
    items: c.renglones.map((r) => ({
      ...(r.id ? { id: r.id } : {}), producto_id: r.producto_id, descripcion: r.descripcion, cantidad: r.cantidad, precio_unitario: r.precio_unitario,
      margen_aplicado: r.margen_aplicado, ...(r.id ? {} : { costo_neto: r.costo_neto ?? null }),
    })),
  };
}

// Guardar: rechaza con el error del servidor (409 si la venta cambió mientras tanto), o sin `estado` sin conexión.
export function useCorregirVenta() {
  const m = useMutation({
    mutationFn: ({ venta, entrada }: { venta: VentaDelDia; entrada: CorreccionEntrada }) =>
      api<VentaCorregida>(`/ventas/${venta.id}/corregir`, { method: "POST", body: JSON.stringify(entrada) }),
    onSuccess: ventasCambiaron,
  }, consultas);
  return { corregir: (venta: VentaDelDia, entrada: CorreccionEntrada) => m.mutateAsync({ venta, entrada }), guardando: m.isPending };
}
