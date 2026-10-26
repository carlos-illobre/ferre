import { nombreDe } from "../autenticacion.js";
import { randomUUID } from "node:crypto";
import { base } from "../persistencia/conexion.js";
import { anotarEvento } from "../eventos/anotar.js";
import { subtotalDeRenglon } from "../precios.js";
import type { VentaDelDia, VentasDelDia } from "../contratos/ventas.js";
import * as datos from "../persistencia/ventas.js";
import type { z } from "zod";
import type { CambioRegistrado, Consulta, VentaParaCambio, VentaRegistrada } from "../contratos/ventas.js";
import type { cambioDeVenta, consultaNueva, correccionDeVenta, ventaNueva } from "./esquemas.js";
import type { Ejecutor } from "../persistencia/transaccion.js";
import type { Enviable } from "../enviable.js";

// La venta (issue #15), en sus reglas (ADR-018, etapa 5): reemplaza el renglón del cuaderno.
// Cada ítem guarda costo, margen, precio y explicación DE ESE MOMENTO, así el precio se puede
// explicar para siempre aunque el costo cambie (#47). Cada ítem con producto descuenta stock
// (#33). El id lo genera el cliente: una venta hecha sin conexión se reenvía y no se duplica (#18).
// Lo que llega ya viene validado con su esquema (`esquemas.ts`).
export type VentaEntrada = z.output<typeof ventaNueva>;
// Los números del detalle de una anomalía, con coma decimal.
const coma = (n: number) => String(n).replace(".", ",");
// Una cantidad con su unidad, abreviada como en las pantallas: «3 un.», «1,5 kg» (decisión 144).
const conUnidad = (n: number, u: string) => `${coma(n)} ${u === "unidad" ? "un." : u === "l" ? "L" : u}`;

export type Registrada = VentaRegistrada;

// Registra una venta ya validada. Si ese id ya estaba (un reenvío), devuelve la guardada.
export async function registrar(v: VentaEntrada, usuarioId: string): Promise<Registrada> {
  const id = v.id ?? randomUUID();
  const fecha = v.fecha ?? new Date().toISOString();
  // Cada renglón calculado se redondea para arriba a $1.000; el de precio a mano (llega sin margen
  // aplicado: un ítem libre o un precio tipeado) se cobra tal cual (RF-19, decisión 128).
  const total = v.items.reduce((s, it) => s + subtotalDeRenglon({ precioUnitario: it.precio_unitario, cantidad: it.cantidad, aMano: it.margen_aplicado == null }).valor, 0);
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
        const u = await datos.unidadDe(trx, it.producto_id);
        const detalle = `${it.cantidad === 1 && u === "unidad" ? "Se vendió 1 un." : `Se vendieron ${conUnidad(it.cantidad, u)}`} y el sistema tenía ${conUnidad(enStock, u)} en stock: ${falta === 1 && u === "unidad" ? "faltaba 1 un." : `faltaban ${conUnidad(falta, u)}`}`;
        await datos.anotarFaltante(trx, { producto_id: it.producto_id, usuario_id: usuarioId, usuario_nombre: nombreDe(usuarioId), venta_id: id, cantidad: falta, detalle });
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
    ...v, fecha: new Date(v.fecha).toISOString(), pagada_en: v.pagada_en ? new Date(v.pagada_en).toISOString() : null, version: v.version ? new Date(v.version).toISOString() : undefined,
    items: v.items.map((i) => ({ ...i, subtotal: subtotalDeRenglon({ precioUnitario: Number(i.precio_unitario), cantidad: Number(i.cantidad), aMano: i.margen_aplicado == null }).valor })),
  }));
  const totales: VentasDelDia["totales"] = {};
  for (const v of ventas) if (v.estado === "confirmada") totales[v.medio_pago] = (totales[v.medio_pago] ?? 0) + Number(v.total);
  // Lo cobrado y lo devuelto ese día por correcciones y cambios, aunque la venta sea de otro día (RF-131).
  const movimientos = (await datos.movimientosDelDia(base, dia)).map(({ suma, ...m }) => ({ ...m, fecha: new Date(m.fecha).toISOString(), importe: Number(m.importe), suma: Boolean(suma) }));
  for (const m of movimientos) if (m.suma) totales[m.medio_pago] = (totales[m.medio_pago] ?? 0) + m.importe;
  return { dia: dia ?? new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10), ventas, totales, total: Object.values(totales).reduce((a, b) => a + b, 0), movimientos };
}

// Anular: la venta queda marcada (no se borra) y vuelve al stock lo que descontó de verdad.
// Las de hoy las anula quien puede anular ventas del día; las de otro día, solo quien puede
// anular las de cualquier día (decisión 53).
// Una venta con cambios o correcciones también se anula y se deshace todo (019, E32): vuelve el stock
// que el cliente tiene, lo fallado sigue afuera y la plata de sus cambios deja de contar.
export async function anular(id: string, motivo: string | undefined, usuarioId: string, cualquierDia: boolean): Promise<"anulada" | "no-es-de-hoy" | "no-se-puede"> {
  return base.transaction().execute(async (trx) => {
    if (!cualquierDia && (await datos.esDeHoy(trx, id)) === false) return "no-es-de-hoy";
    if (!(await datos.marcarAnulada(trx, id))) return "no-se-puede";
    await datos.devolverStock(trx, id);
    await datos.dejarAfueraLoFallado(trx, id);
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
export async function anotarConsultas(c: z.output<typeof consultaNueva>): Promise<void> {
  for (const it of c.items) {
    if (!it.descripcion?.trim()) continue;
    await datos.anotarConsulta(base, { producto_id: it.producto_id ?? null, descripcion: it.descripcion.trim(), precio_ofrecido: it.precio_ofrecido ?? null, motivo: c.motivo?.trim() || null, dispositivo_id: c.dispositivo_id ?? null });
  }
}
export const consultas = (): Promise<Enviable<Consulta>[]> => datos.ultimasConsultas(base);

// Los cuatro productos de las últimas ventas, para que la venta vacía los ofrezca (decisión 133).
export const ULTIMOS_PRODUCTOS = 4;
export const ultimosProductos = () => datos.ultimosProductosVendidos(base, ULTIMOS_PRODUCTOS);

// --- Corregir una venta (019, RF-126 a RF-128, ADR-024) ---

export type CorreccionEntrada = z.output<typeof correccionDeVenta>;
type Foto = { medio_pago: string; cliente_id: string | null; total: number; items: { id: string; descripcion: string; cantidad: number; precio_unitario: number }[] };
export type Corregida = { id: string; total: number; diferencia: number; resuelta: "cobrada" | "devuelta" | "cuenta_corriente" | "sin_diferencia"; version: string };
export type NoSeCorrige = "no-existe" | "anulada" | "no-es-de-hoy" | "cambio" | "devuelve-de-mas" | "cliente";

// Saca del stock lo que se suma a una venta; si no alcanza, queda en cero y se anota lo que faltó (RF-59).
async function sacarDelStock(trx: Ejecutor, productoId: string, cantidad: number, ventaId: string, usuarioId: string, tipo: "correccion" | "cambio") {
  const enStock = Math.max(0, await datos.stockDe(trx, productoId));
  const sale = Math.min(cantidad, enStock);
  if (sale > 0) await datos.moverStock(trx, { producto_id: productoId, cantidad: -sale, tipo, venta_id: ventaId, nota: tipo === "correccion" ? "corrección de venta" : "cambio de producto" });
  const falta = Math.round((cantidad - sale) * 1000) / 1000;
  if (falta > 0) {
    const u = await datos.unidadDe(trx, productoId);
    await datos.anotarFaltante(trx, { producto_id: productoId, usuario_id: usuarioId, usuario_nombre: nombreDe(usuarioId), venta_id: ventaId, cantidad: falta, detalle: `Se sumaron ${conUnidad(cantidad, u)} y el sistema tenía ${conUnidad(enStock, u)} en stock: faltaba ${conUnidad(falta, u)}` });
  }
}

export async function corregir(id: string, c: CorreccionEntrada, usuarioId: string, cualquierDia: boolean): Promise<Corregida | NoSeCorrige> {
  return base.transaction().execute(async (trx) => {
    const venta = await datos.ventaParaCorregir(trx, id);
    if (!venta) return "no-existe";
    if (venta.estado !== "confirmada") return "anulada";
    if (!venta.de_hoy && !cualquierDia) return "no-es-de-hoy";
    if (new Date(venta.modificado_en).toISOString() !== new Date(c.version).toISOString()) return "cambio";
    const clienteId = c.cliente_id ?? null;
    if (c.medio_pago === "cuenta_corriente" && !(clienteId && (await datos.clienteConCuentaCorriente(trx, clienteId)))) return "cliente";

    const vigentes = await datos.renglonesVigentes(trx, id);
    const porId = new Map(vigentes.map((r) => [r.id, r]));
    // Un renglón que ya volvió en parte por un cambio no baja de lo devuelto.
    for (const it of c.items) {
      const previo = it.id ? porId.get(it.id) : undefined;
      if (it.id && !previo) return "no-existe";
      if (previo && it.cantidad < Number(previo.devuelto)) return "devuelve-de-mas";
    }
    const quitados = vigentes.filter((r) => !c.items.some((it) => it.id === r.id));
    if (quitados.some((r) => Number(r.devuelto) > 0)) return "devuelve-de-mas";

    // La cuenta la hace el servidor con los renglones (019-E31): el precio a mano, tal cual (RF-19).
    const subtotal = (it: { precio_unitario: number; cantidad: number; margen_aplicado?: number | null }) => subtotalDeRenglon({ precioUnitario: it.precio_unitario, cantidad: it.cantidad, aMano: it.margen_aplicado == null }).valor;
    const total = c.items.reduce((s, it) => s + subtotal(it), 0);
    const totalAntes = Number(venta.total);
    const diferencia = Math.round((total - totalAntes) * 100) / 100;
    const resuelta = c.medio_pago === "cuenta_corriente" ? "cuenta_corriente" : diferencia > 0 ? "cobrada" : diferencia < 0 ? "devuelta" : "sin_diferencia";

    const foto = (medio: string, cliente: string | null, t: number, items: Foto["items"]): Foto => ({ medio_pago: medio, cliente_id: cliente, total: t, items });
    const antes = foto(venta.medio_pago, venta.cliente_id, totalAntes, vigentes.map((r) => ({ id: r.id, descripcion: r.descripcion, cantidad: Number(r.cantidad), precio_unitario: Number(r.precio_unitario) })));
    const correccionId = randomUUID();
    const nuevos: { item: (typeof c.items)[number]; id: string }[] = c.items.filter((it) => !it.id).map((item) => ({ item, id: randomUUID() }));
    const despues = foto(c.medio_pago, clienteId, total, [
      ...c.items.filter((it) => it.id).map((it) => ({ id: it.id!, descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: it.precio_unitario })),
      ...nuevos.map(({ item, id: nid }) => ({ id: nid, descripcion: item.descripcion, cantidad: item.cantidad, precio_unitario: item.precio_unitario })),
    ]);
    await datos.insertarCorreccion(trx, { id: correccionId, venta_id: id, usuario_id: usuarioId, dispositivo_id: c.dispositivo_id ?? null, antes, despues, diferencia, resuelta });

    // Los renglones: los que siguen se actualizan; los quitados se marcan (no se borran); los nuevos se agregan.
    // El stock se mueve por la diferencia de cada uno.
    for (const it of c.items.filter((x) => x.id)) {
      const previo = porId.get(it.id!)!;
      await datos.actualizarRenglon(trx, it.id!, { cantidad: it.cantidad, precio_unitario: it.precio_unitario, margen_aplicado: it.margen_aplicado ?? null });
      const delta = Math.round((it.cantidad - Number(previo.cantidad)) * 1000) / 1000;
      if (!previo.producto_id || delta === 0) continue;
      if (delta > 0) await sacarDelStock(trx, previo.producto_id, delta, id, usuarioId, "correccion");
      else await datos.moverStock(trx, { producto_id: previo.producto_id, cantidad: -delta, tipo: "correccion", venta_id: id, nota: "corrección de venta" });
    }
    for (const r of quitados) {
      await datos.quitarRenglon(trx, r.id, correccionId);
      if (r.producto_id) await datos.moverStock(trx, { producto_id: r.producto_id, cantidad: Number(r.cantidad), tipo: "correccion", venta_id: id, nota: "corrección de venta: renglón quitado" });
    }
    let orden = await datos.ultimoOrden(trx, id);
    for (const { item: it, id: nid } of nuevos) {
      await trx.insertInto("item_venta").values({ id: nid, venta_id: id, orden: ++orden, producto_id: it.producto_id ?? null, descripcion: it.descripcion.trim(), cantidad: it.cantidad, costo_neto: it.costo_neto ?? null,
        precio_proveedor_id: it.precio_proveedor_id ?? null, margen_aplicado: it.margen_aplicado ?? null, precio_unitario: it.precio_unitario.toFixed(2), explicacion: JSON.stringify(it.explicacion ?? {}) }).execute();
      if (it.producto_id) await sacarDelStock(trx, it.producto_id, it.cantidad, id, usuarioId, "correccion");
    }
    await datos.actualizarVenta(trx, id, { total, medio_pago: c.medio_pago, cliente_id: clienteId });

    // La plata: en cuenta corriente la deuda ya cambió con el total; si no, se cobra o se devuelve en efectivo.
    if (resuelta === "cobrada") await datos.insertarMovimientoDeDinero(trx, { tipo: "cobro_diferencia", medio_pago: c.medio_diferencia ?? "efectivo", cliente_id: null, importe: diferencia, venta_id: id, correccion_id: correccionId, usuario_id: usuarioId });
    if (resuelta === "devuelta") await datos.insertarMovimientoDeDinero(trx, { tipo: "devolucion", medio_pago: "efectivo", cliente_id: null, importe: diferencia, venta_id: id, correccion_id: correccionId, usuario_id: usuarioId });

    await anotarEvento(trx, { tipo: "venta.corregida", usuarioId, dispositivoId: c.dispositivo_id ?? null, contenido: { id, correccion: correccionId, antes, despues, diferencia, resuelta, medio_diferencia: resuelta === "cobrada" ? c.medio_diferencia ?? "efectivo" : null } });
    const ahora = await datos.ventaParaCorregir(trx, id);
    return { id, total, diferencia, resuelta, version: new Date(ahora!.modificado_en).toISOString() };
  });
}

// --- Cambio de producto (019, RF-129 y RF-130, ADR-024) ---

export type CambioEntrada = z.output<typeof cambioDeVenta>;
export type Cambiado = CambioRegistrado;
export type NoSeCambia = "no-existe" | "anulada" | "vencida" | "devuelve-de-mas";
// Un cambio se acepta hasta 15 días después de la venta (decisión 135).
export const DIAS_PARA_CAMBIAR = 15;

// Las ventas con un producto que coincide, para encontrar la original (E11). Cada renglón dice
// cuánto queda por devolver y el precio por unidad que se pagó (el del renglón como se cobró).
export async function paraCambio(buscado: string): Promise<VentaParaCambio[]> {
  if (buscado.trim().length < 2) return [];
  const filas = await datos.ventasParaCambio(base, buscado.trim(), DIAS_PARA_CAMBIAR);
  return filas.map((v) => ({
    id: v.id, fecha: new Date(v.fecha).toISOString(), medio_pago: v.medio_pago, cliente: v.cliente, total: v.total,
    items: v.items.map((i) => ({ id: i.id, producto_id: i.producto_id, descripcion: i.descripcion, cantidad: i.cantidad, foto_url: i.foto_url, unidad: i.unidad,
      por_devolver: Math.round((Number(i.cantidad) - Number(i.devuelto)) * 1000) / 1000, pagado: pagadoPorUnidad(i) })),
  }));
}
// Lo que se pagó por unidad: el subtotal como se cobró (con su redondeo) dividido la cantidad.
const pagadoPorUnidad = (i: { cantidad: string | number; precio_unitario: string | number; margen_aplicado: number | string | null }) =>
  Math.round((subtotalDeRenglon({ precioUnitario: Number(i.precio_unitario), cantidad: Number(i.cantidad), aMano: i.margen_aplicado == null }).valor / Number(i.cantidad)) * 100) / 100;

// Registra un cambio: lo que vuelve (al precio que se pagó; fallado no vuelve al stock y queda
// anotado), lo que se lleva (sale del stock como en una venta) y la diferencia: se cobra con el
// medio elegido, se devuelve en efectivo o, si la venta fue a cuenta corriente, cambia la deuda.
// Sin nada que se lleve es una devolución (E18). La venta original no cambia: queda unida al cambio.
export async function cambiar(id: string, c: CambioEntrada, usuarioId: string): Promise<Cambiado | NoSeCambia> {
  return base.transaction().execute(async (trx) => {
    const venta = await datos.ventaParaCorregir(trx, id);
    if (!venta) return "no-existe";
    if (venta.estado !== "confirmada") return "anulada";
    if (Date.now() - new Date(venta.fecha).getTime() > DIAS_PARA_CAMBIAR * 86_400_000) return "vencida";
    const vigentes = new Map((await datos.renglonesVigentes(trx, id)).map((r) => [r.id, r]));
    // Lo que vuelve de un mismo renglón se suma: no puede pasar lo que queda por devolver (E26).
    const pedido = new Map<string, number>();
    for (const v of c.vuelve) {
      const r = vigentes.get(v.item_id);
      if (!r) return "no-existe";
      pedido.set(r.id, (pedido.get(r.id) ?? 0) + v.cantidad);
      if (pedido.get(r.id)! > Number(r.cantidad) - Number(r.devuelto) + 1e-9) return "devuelve-de-mas";
    }
    const valorVuelve = Math.round(c.vuelve.reduce((s, v) => s + pagadoPorUnidad(vigentes.get(v.item_id)!) * v.cantidad, 0) * 100) / 100;
    const valorLleva = c.se_lleva.reduce((s, it) => s + subtotalDeRenglon({ precioUnitario: it.precio_unitario, cantidad: it.cantidad, aMano: it.margen_aplicado == null }).valor, 0);
    const diferencia = Math.round((valorLleva - valorVuelve) * 100) / 100;
    const resuelto = venta.medio_pago === "cuenta_corriente" ? "cuenta_corriente" : diferencia > 0 ? "cobrado" : diferencia < 0 ? "devuelto" : "sin_diferencia";

    const cambioId = randomUUID();
    await datos.insertarCambio(trx, { id: cambioId, venta_id: id, usuario_id: usuarioId, dispositivo_id: c.dispositivo_id ?? null, diferencia, resuelto });
    for (const v of c.vuelve) {
      const r = vigentes.get(v.item_id)!;
      await datos.insertarRenglonDeCambio(trx, { cambio_id: cambioId, lado: "vuelve", item_venta_id: r.id, producto_id: r.producto_id, descripcion: r.descripcion, cantidad: v.cantidad, precio_unitario: pagadoPorUnidad(r), margen_aplicado: null, fallado: v.fallado });
      await datos.sumarDevuelto(trx, r.id, v.cantidad);
      if (!r.producto_id) continue;
      if (v.fallado) await datos.anotarDevueltoFallado(trx, { producto_id: r.producto_id, usuario_id: usuarioId, usuario_nombre: nombreDe(usuarioId), venta_id: id, cantidad: v.cantidad, detalle: `Volvió fallado: ${conUnidad(v.cantidad, await datos.unidadDe(trx, r.producto_id))} de ${r.descripcion}; no vuelve al stock` });
      else await datos.moverStock(trx, { producto_id: r.producto_id, cantidad: v.cantidad, tipo: "cambio", venta_id: id, nota: "cambio de producto: vuelve" });
    }
    for (const it of c.se_lleva) {
      await datos.insertarRenglonDeCambio(trx, { cambio_id: cambioId, lado: "se_lleva", item_venta_id: null, producto_id: it.producto_id ?? null, descripcion: it.descripcion.trim(), cantidad: it.cantidad, precio_unitario: it.precio_unitario, margen_aplicado: it.margen_aplicado ?? null, fallado: false });
      if (it.producto_id) await sacarDelStock(trx, it.producto_id, it.cantidad, id, usuarioId, "cambio");
    }
    if (diferencia !== 0) {
      const tipo = diferencia > 0 ? "cobro_diferencia" : "devolucion";
      const medio = resuelto === "cuenta_corriente" ? "cuenta_corriente" : resuelto === "cobrado" ? c.medio_diferencia ?? "efectivo" : "efectivo";
      await datos.insertarMovimientoDeDinero(trx, { tipo, medio_pago: medio, cliente_id: medio === "cuenta_corriente" ? venta.cliente_id : null, importe: diferencia, venta_id: id, cambio_id: cambioId, usuario_id: usuarioId });
    }
    await anotarEvento(trx, { tipo: "venta.cambio", usuarioId, dispositivoId: c.dispositivo_id ?? null, contenido: {
      venta: id, cambio: cambioId, diferencia, resuelto, medio_diferencia: resuelto === "cobrado" ? c.medio_diferencia ?? "efectivo" : null,
      vuelve: c.vuelve.map((v) => ({ descripcion: vigentes.get(v.item_id)!.descripcion, cantidad: v.cantidad, fallado: v.fallado })),
      se_lleva: c.se_lleva.map((it) => ({ descripcion: it.descripcion, cantidad: it.cantidad, precio_unitario: it.precio_unitario })),
    } });
    return { id: cambioId, venta_id: id, vuelve: valorVuelve, se_lleva: valorLleva, diferencia, resuelto };
  });
}
