import { randomUUID } from "node:crypto";
import { base, Deshacer, enTransaccion } from "../base.js";
import { anotarEvento } from "../eventos.js";
import * as datos from "./datos.js";
import type { CompraEntrada, CompraRegistrada, CompraReciente, CompraRepetida, FotoDeComprobante, GastosDeLaSemana, ItemDeCompraEntrada, RenglonDeCompra } from "../contratos/compras.js";
import type { Enviable } from "../enviable.js";

export { carpetaComprobantes } from "./datos.js";

// Ingreso de mercadería (issue #30): reemplaza el papel semanal de gastos y es la mitad del
// stock (lo que entra). Cada renglón suma stock; si el costo de la factura difiere del de la
// lista, pasa a ser el costo vigente de ese producto para ese proveedor, con la explicación
// «según factura», porque el precio de venta sigue la realidad, no la lista.
export const COMPROBANTES = ["factura", "remito", "sin_comprobante"] as const;
export type ItemEntrada = ItemDeCompraEntrada;
export type { CompraEntrada };
export type Rechazo = { error: string; estado: 400 | 404 | 409 };
const TIPOS_DE_FOTO: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const ARCHIVO_DE_FOTO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const MAXIMO_DE_FOTO = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validar(v: CompraEntrada): string | null {
  if (v.id && !UUID.test(v.id)) return "El id de la compra tiene que ser un UUID";
  if (!v.proveedor_id || !UUID.test(v.proveedor_id)) return "Elegí el proveedor";
  if (v.pedido_id && !UUID.test(v.pedido_id)) return "El pedido no es válido";
  if (!COMPROBANTES.includes(v.comprobante_tipo)) return `El comprobante es uno de ${COMPROBANTES.join(", ")}`;
  if (v.foto && !ARCHIVO_DE_FOTO.test(v.foto)) return "La foto del comprobante no es válida";
  if (v.fecha && !/^\d{4}-\d{2}-\d{2}$/.test(v.fecha)) return "La fecha tiene que ser AAAA-MM-DD";
  if (!Array.isArray(v.items) || v.items.length === 0) return "La compra no tiene productos";
  for (const [i, it] of v.items.entries()) {
    if (!it.descripcion?.trim()) return `El renglón ${i + 1} no tiene descripción`;
    if (!(it.cantidad > 0)) return `El renglón ${i + 1} tiene cantidad inválida`;
    if (!(it.costo_unitario >= 0)) return `El renglón ${i + 1} tiene costo inválido`;
  }
  return null;
}

const fechaLegible = (iso: string) => { const [a, m, d] = iso.split("-"); return `${d}/${m}/${a}`; };

// La foto del comprobante se sube sola, antes de registrar la compra. Queda suelta, a nombre
// de quien la subió, hasta que una compra la toma.
export async function subirFoto(f: unknown, usuarioId: string): Promise<FotoDeComprobante | { error: string }> {
  if (!(f instanceof File)) return { error: "Falta la foto" };
  if (!TIPOS_DE_FOTO[f.type]) return { error: "La foto tiene que ser jpeg, png o webp" };
  if (f.size > MAXIMO_DE_FOTO) return { error: "La foto pesa más de 10 MB" };
  return { foto: await datos.guardarFoto(base, Buffer.from(await f.arrayBuffer()), TIPOS_DE_FOTO[f.type]!, usuarioId) };
}

// Con sesión: un comprobante muestra a quién se le compra y a cuánto.
export async function foto(archivo: string) {
  if (!ARCHIVO_DE_FOTO.test(archivo)) return null;
  const contenido = await datos.leerFoto(archivo);
  if (!contenido) return null;
  return { contenido: new Uint8Array(contenido), tipo: Object.entries(TIPOS_DE_FOTO).find(([, ext]) => archivo.endsWith(ext))![0] };
}

// Registra una compra ya validada. Si ese id ya estaba (un reenvío), devuelve la guardada.
export async function registrar(v: CompraEntrada, usuarioId: string): Promise<Rechazo | CompraRegistrada | CompraRepetida> {
  const id = v.id ?? randomUUID();
  const fecha = v.fecha ?? new Date().toISOString().slice(0, 10);
  const total = v.items.reduce((s, it) => s + it.cantidad * it.costo_unitario, 0);
  const resultado = { productos_nuevos: 0, costos_actualizados: 0 };
  return enTransaccion(async (trx) => {
    const previa = await datos.compraPorId(trx, id);
    if (previa) throw new Deshacer({ id, total: Number(previa.total), repetida: true });
    const proveedor = await datos.nombreDelProveedorActivo(trx, v.proveedor_id);
    if (!proveedor) throw new Deshacer({ error: "No existe ese proveedor", estado: 404 });
    // Si la mercadería es de un pedido (RF-55), el pedido tiene que estar esperándola y ser de este proveedor.
    if (v.pedido_id) {
      const ped = await datos.pedidoTrabado(trx, v.pedido_id);
      if (!ped) throw new Deshacer({ error: "No existe ese pedido", estado: 404 });
      if (ped.proveedor_id !== v.proveedor_id) throw new Deshacer({ error: "Ese pedido es de otro proveedor", estado: 409 });
      if (ped.estado !== "enviado" && ped.estado !== "recibido_parcial") throw new Deshacer({ error: "Ese pedido ya no espera mercadería", estado: 409 });
    }
    // El número ya no se pide: está en la foto. Si llega (versiones anteriores), se usa.
    const comprobante = v.comprobante_tipo === "sin_comprobante" ? "sin comprobante" : [v.comprobante_tipo, v.comprobante_numero?.trim()].filter(Boolean).join(" ");
    await datos.insertarCompra(trx, { id, proveedor_id: v.proveedor_id, fecha, comprobante_tipo: v.comprobante_tipo, comprobante_numero: v.comprobante_numero?.trim() || null, total: total.toFixed(2), nota: v.nota?.trim() || null, pedido_id: v.pedido_id ?? null });
    if (v.foto && v.comprobante_tipo !== "sin_comprobante") await datos.tomarFoto(trx, id, v.foto);
    for (const [orden, it] of v.items.entries()) {
      let productoId = it.producto_id ?? null;
      if (!productoId) { productoId = await datos.productoNuevo(trx, it.descripcion.trim(), it.marca?.trim() || null, v.proveedor_id); resultado.productos_nuevos++; }
      await datos.renglonYStock(trx, id, orden + 1, productoId, it.cantidad, it.costo_unitario.toFixed(4), fecha);
      // Si la factura dice otra cosa que la lista, manda la factura.
      const vig = await datos.costoVigente(trx, productoId, v.proveedor_id);
      const costoVigente = vig ? Number(vig.costo_neto) : null;
      if (costoVigente === null || Math.abs(costoVigente - it.costo_unitario) > 0.005) {
        await datos.nuevoCosto(trx, {
          productoId, proveedorId: v.proveedor_id, codigo: vig?.codigo_proveedor ?? it.descripcion.trim().slice(0, 60), descripcion: it.descripcion.trim(), costo: it.costo_unitario.toFixed(4),
          descuentos: JSON.stringify({ pasos: [], explicacion: [`Costo ${it.costo_unitario.toFixed(2)} según ${comprobante} de ${proveedor} del ${fechaLegible(fecha)}${costoVigente !== null ? ` (la lista decía ${costoVigente.toFixed(2)})` : ""}`] }),
          iva: vig?.iva ?? "0.21", fecha,
        });
        resultado.costos_actualizados++;
      }
    }
    // Lo que llegó se anota en el pedido: queda «recibido» si llegó todo, o «recibido parcial».
    if (v.pedido_id) {
      for (const it of v.items) if (it.producto_id) await datos.recibidoEnPedido(trx, v.pedido_id, it.producto_id, it.cantidad);
      const estado = (await datos.renglonesQueFaltan(trx, v.pedido_id)) > 0 ? "recibido_parcial" : "recibido";
      await datos.estadoDelPedido(trx, v.pedido_id, estado);
      await anotarEvento(trx, { tipo: "pedido.recibido", usuarioId, contenido: { id: v.pedido_id, compra: id, proveedor, estado } });
    }
    await anotarEvento(trx, { tipo: "compra.registrada", usuarioId, contenido: { id, proveedor, fecha, comprobante, foto: v.foto ?? null, total, items: v.items.length, ...resultado, ...(v.pedido_id ? { pedido: v.pedido_id } : {}) } });
    return { id, total, ...resultado, ...(v.pedido_id ? { pedido: v.pedido_id } : {}) };
  });
}

export const recientes = (): Promise<Enviable<CompraReciente>[]> => datos.recientes(base);

// El papel de gastos de la semana, que ya no se tira: total por proveedor, últimos 7 días.
export async function semana(): Promise<GastosDeLaSemana> {
  const filas = await datos.gastosDeLaSemana(base);
  return { desde: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), por_proveedor: filas, total: filas.reduce((s, r) => s + Number(r.total), 0) };
}

export const renglones = (id: string): Promise<Enviable<RenglonDeCompra>[]> => datos.renglonesDe(base, id);

// Anular: la compra queda marcada y el stock vuelve con un ajuste. El costo que se registró por
// la factura no se toca: fue real aunque la compra se haya anulado.
export function anular(id: string, motivo: string | undefined, usuarioId: string): Promise<boolean> {
  return enTransaccion(async (trx) => {
    if (!(await datos.marcarAnulada(trx, id))) throw new Deshacer(false);
    await datos.devolverStock(trx, id);
    await anotarEvento(trx, { tipo: "compra.anulada", usuarioId, contenido: { id, motivo: motivo?.trim() || null } });
    return true;
  });
}
