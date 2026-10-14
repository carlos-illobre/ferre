import { randomUUID } from "node:crypto";
import { base } from "../base.js";
import { anotarEvento } from "../eventos.js";
import { subtotalDeRenglon } from "../precios.js";
import type { VentaDelDia, VentasDelDia } from "../contratos/ventas.js";
import * as datos from "./datos.js";

// La venta (issue #15), en sus reglas (ADR-018, etapa 5): reemplaza el renglón del cuaderno.
// Cada ítem guarda costo, margen, precio y explicación DE ESE MOMENTO, así el precio se puede
// explicar para siempre aunque el costo cambie (#47). Cada ítem con producto descuenta stock
// (#33). El id lo genera el cliente: una venta hecha sin conexión se reenvía y no se duplica (#18).
export const MEDIOS = ["efectivo", "mercado_pago", "tarjeta", "cuenta_corriente"] as const;
export type Medio = (typeof MEDIOS)[number];
export type ItemEntrada = {
  producto_id?: string | null; descripcion: string; cantidad: number; precio_unitario: number;
  costo_neto?: number | null; margen_aplicado?: number | null; explicacion?: unknown; precio_proveedor_id?: string | null;
};
export type VentaEntrada = { id?: string; fecha?: string; cliente_id?: string | null; medio_pago: Medio; items: ItemEntrada[]; dispositivo_id?: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Los números del detalle de una anomalía, con coma decimal.
const coma = (n: number) => String(n).replace(".", ",");

export function validar(v: VentaEntrada): string | null {
  if (v.id && !UUID.test(v.id)) return "El id de la venta tiene que ser un UUID";
  if (!MEDIOS.includes(v.medio_pago)) return `El medio de pago es uno de ${MEDIOS.join(", ")}`;
  if (v.medio_pago === "cuenta_corriente" && !v.cliente_id) return "Una venta a cuenta corriente necesita el cliente";
  if (!Array.isArray(v.items) || v.items.length === 0) return "La venta no tiene productos";
  for (const [i, it] of v.items.entries()) {
    if (!it.descripcion?.trim()) return `El ítem ${i + 1} no tiene descripción`;
    if (!(it.cantidad > 0)) return `El ítem ${i + 1} tiene cantidad inválida`;
    if (!(it.precio_unitario >= 0)) return `El ítem ${i + 1} tiene precio inválido`;
  }
  return null;
}

export type Registrada = { id: string; total: number; estado: string; repetida?: true };

// Registra una venta ya validada. Si ese id ya estaba (un reenvío), devuelve la guardada.
export async function registrar(v: VentaEntrada, usuarioId: string): Promise<Registrada> {
  const id = v.id ?? randomUUID();
  const fecha = v.fecha ?? new Date().toISOString();
  // Cada renglón se redondea para arriba a $1.000 (RF-19): toda venta es múltiplo de $1.000.
  const total = v.items.reduce((s, it) => s + subtotalDeRenglon({ precioUnitario: it.precio_unitario, cantidad: it.cantidad }).valor, 0);
  return base.transaction().execute(async (trx) => {
    const previa = await datos.ventaPorId(trx, id);
    if (previa) return { id, total: Number(previa.total), estado: previa.estado, repetida: true as const };
    await datos.insertarVenta(trx, { id, fecha, cliente_id: v.cliente_id ?? null, medio_pago: v.medio_pago, total: total.toFixed(2), dispositivo_id: v.dispositivo_id ?? null });
    let anomalias = 0;
    for (const [orden, it] of v.items.entries()) {
      await datos.insertarRenglon(trx, {
        venta_id: id, orden: orden + 1, producto_id: it.producto_id ?? null, descripcion: it.descripcion.trim(), cantidad: it.cantidad, costo_neto: it.costo_neto ?? null,
        precio_proveedor_id: it.precio_proveedor_id ?? null, margen_aplicado: it.margen_aplicado ?? null, precio_unitario: it.precio_unitario.toFixed(2), explicacion: JSON.stringify(it.explicacion ?? {}),
      });
      if (!it.producto_id) continue;
      // Una venta nunca deja el stock por debajo de cero (RF-59): se descuenta lo que hay y lo
      // que faltaba queda anotado como anomalía. Lo vendido ya no hay que inventariarlo.
      const enStock = Math.max(0, await datos.stockDe(trx, it.producto_id));
      const descuenta = Math.min(it.cantidad, enStock);
      if (descuenta > 0) await datos.descontarStock(trx, { producto_id: it.producto_id, cantidad: descuenta, venta_id: id, fecha });
      const falta = Math.round((it.cantidad - descuenta) * 1000) / 1000;
      if (falta > 0) {
        const detalle = `${it.cantidad === 1 ? "Se vendió 1" : `Se vendieron ${coma(it.cantidad)}`} y el sistema tenía ${coma(enStock)} en stock: ${falta === 1 ? "faltaba 1" : `faltaban ${coma(falta)}`}`;
        await datos.anotarFaltante(trx, { producto_id: it.producto_id, usuario_id: usuarioId, venta_id: id, cantidad: falta, detalle });
        anomalias++;
      }
    }
    await anotarEvento(trx, { tipo: "venta.registrada", usuarioId, dispositivoId: v.dispositivo_id ?? null, contenido: { id, total, medio_pago: v.medio_pago, cliente_id: v.cliente_id ?? null, items: v.items.length, ...(anomalias ? { anomalias } : {}) } });
    return { id, total, estado: "confirmada" };
  });
}

// Las ventas de un día (sin día, hoy) con el subtotal de cada renglón y el total por medio de pago.
export async function delDia(dia: string | null): Promise<VentasDelDia> {
  const filas = await datos.ventasDelDia(base, dia);
  const ventas: VentaDelDia[] = filas.map((v) => ({
    ...v, fecha: new Date(v.fecha).toISOString(), pagada_en: v.pagada_en ? new Date(v.pagada_en).toISOString() : null,
    items: v.items.map((i) => ({ ...i, subtotal: subtotalDeRenglon({ precioUnitario: Number(i.precio_unitario), cantidad: Number(i.cantidad) }).valor })),
  }));
  const totales: VentasDelDia["totales"] = {};
  for (const v of ventas) if (v.estado === "confirmada") totales[v.medio_pago] = (totales[v.medio_pago] ?? 0) + Number(v.total);
  return { dia: dia ?? new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10), ventas, totales, total: Object.values(totales).reduce((a, b) => a + b, 0) };
}

// Anular: la venta queda marcada (no se borra) y vuelve al stock lo que descontó de verdad.
// Las de hoy las anula quien puede anular ventas del día; las de otro día, solo quien puede
// anular las de cualquier día (decisión 53).
export async function anular(id: string, motivo: string | undefined, usuarioId: string, cualquierDia: boolean): Promise<"anulada" | "no-es-de-hoy" | "no-se-puede"> {
  return base.transaction().execute(async (trx) => {
    if (!cualquierDia && (await datos.esDeHoy(trx, id)) === false) return "no-es-de-hoy";
    if (!(await datos.marcarAnulada(trx, id))) return "no-se-puede";
    await datos.devolverStock(trx, id);
    await anotarEvento(trx, { tipo: "venta.anulada", usuarioId, contenido: { id, motivo: motivo?.trim() || null } });
    return "anulada";
  });
}

// Cuenta corriente: marcar pagada una venta («tachar el renglón»).
export async function pagar(id: string, usuarioId: string): Promise<boolean> {
  if (!(await datos.marcarPagada(base, id))) return false;
  await anotarEvento(base, { tipo: "venta.pagada", usuarioId, contenido: { id } });
  return true;
}

// «No llevó»: cada producto consultado, con lo que se le ofreció. Los renglones sin descripción no cuentan.
export type ConsultaEntrada = { items?: { producto_id?: string | null; descripcion: string; precio_ofrecido?: number | null }[]; motivo?: string; dispositivo_id?: string | null };
export async function anotarConsultas(c: ConsultaEntrada): Promise<boolean> {
  if (!c.items?.length) return false;
  for (const it of c.items) {
    if (!it.descripcion?.trim()) continue;
    await datos.anotarConsulta(base, { producto_id: it.producto_id ?? null, descripcion: it.descripcion.trim(), precio_ofrecido: it.precio_ofrecido ?? null, motivo: c.motivo?.trim() || null, dispositivo_id: c.dispositivo_id ?? null });
  }
  return true;
}
export const consultas = () => datos.ultimasConsultas(base);
