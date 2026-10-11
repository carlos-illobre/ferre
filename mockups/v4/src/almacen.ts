// Almacén en memoria: lo que tiene que durar entre pantallas mientras se recorre la maqueta
// (la venta en curso, las ventas del día, el stock, los usuarios…). Se pierde al recargar.
import { useSyncExternalStore } from "react";
import {
  ACTIVIDAD, CLIENTES, COMPRAS, MOVIMIENTOS, NO_LLEVARON, PRODUCTOS, PROVEEDORES, SECTORES, SESIONES, USUARIOS, VENTAS_DE_HOY, YO,
  cantidad, pesos, precioDe, subtotalDe,
  type Cliente, type Compra, type Consulta, type Hecho, type MedioDePago, type Movimiento, type Producto, type Proveedor,
  type RenglonComprado, type Sector, type Sesion, type Unidad, type Usuario, type Venta,
} from "./datos";

// ---------------------------------------------------------------- Forma

export type RenglonDeVenta = {
  id: string;
  /** `null` cuando es «algo que no está en productos». */
  productoId: string | null;
  nombre: string;
  unidad: Unidad;
  cantidad: number;
  /** Precio puesto a mano, solo para esta venta; `null` si vale el precio del producto. */
  precioAMano: number | null;
};

export type VentaEnCurso = {
  renglones: RenglonDeVenta[];
  medio: MedioDePago | null;
  clienteId: string | null;
};

export type Almacen = {
  productos: Producto[];
  clientes: Cliente[];
  proveedores: Proveedor[];
  usuarios: Usuario[];
  sesiones: Sesion[];
  sectores: Sector[];
  venta: VentaEnCurso;
  ventas: Venta[];
  compras: Compra[];
  movimientos: Movimiento[];
  actividad: Hecho[];
  noLlevaron: Consulta[];
  /** Cambios hechos sin conexión que todavía no se enviaron. */
  porEnviar: number;
};

export const VENTA_VACIA: VentaEnCurso = { renglones: [], medio: null, clienteId: null };

function inicial(): Almacen {
  return {
    productos: PRODUCTOS,
    clientes: CLIENTES,
    proveedores: PROVEEDORES,
    usuarios: USUARIOS,
    sesiones: SESIONES,
    sectores: SECTORES,
    venta: VENTA_VACIA,
    ventas: VENTAS_DE_HOY,
    compras: COMPRAS,
    movimientos: MOVIMIENTOS,
    actividad: ACTIVIDAD,
    noLlevaron: NO_LLEVARON,
    porEnviar: 3,
  };
}

// ---------------------------------------------------------------- Mecanismo

let estado: Almacen = inicial();
const oyentes = new Set<() => void>();
let contador = 0;

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}

/** Un identificador nuevo: `nuevoId("v")` → "v-n1". */
export function nuevoId(prefijo: string): string {
  contador += 1;
  return `${prefijo}-n${contador}`;
}

/** Lo que hay ahora en el almacén (para usar fuera de un componente). */
export function leerAlmacen(): Almacen {
  return estado;
}

/** Cambia el almacén. Siempre devolvé un objeto nuevo: `cambiarAlmacen((a) => ({ ...a, usuarios: … }))`. */
export function cambiarAlmacen(cambio: (actual: Almacen) => Almacen): void {
  estado = cambio(estado);
  for (const oyente of oyentes) oyente();
}

/** Vuelve todo a los datos de ejemplo. */
export function reiniciarAlmacen(): void {
  cambiarAlmacen(inicial);
}

/**
 * Lee una parte del almacén y redibuja cuando cambia. El selector tiene que devolver un
 * pedazo que ya existe (`(a) => a.ventas`), no un objeto armado en el momento.
 */
export function useAlmacen<T>(selector: (almacen: Almacen) => T): T {
  return useSyncExternalStore(suscribir, () => selector(estado));
}

// ---------------------------------------------------------------- Cuentas de la venta

export type CuentaDeRenglon = {
  /** Precio de una unidad, o `null` si el renglón está «sin precio». */
  unitario: number | null;
  subtotal: number | null;
  /** Pasos para la pieza `Explicado`. */
  pasos: string[];
  /** `true` si es un producto del catálogo que no tiene margen y nadie le puso precio a mano. */
  sinPrecio: boolean;
};

export function cuentaDeRenglon(renglon: RenglonDeVenta, productos: Producto[]): CuentaDeRenglon {
  const producto = productos.find((p) => p.id === renglon.productoId);
  let unitario: number | null = null;
  let pasos: string[] = [];
  if (renglon.precioAMano !== null) {
    unitario = renglon.precioAMano;
    pasos = [`Precio puesto a mano, solo para esta venta: ${pesos(unitario)}`];
  } else if (producto) {
    const calculo = precioDe(producto);
    if (calculo) { unitario = calculo.valor; pasos = calculo.pasos; }
  }
  if (unitario === null) return { unitario: null, subtotal: null, pasos: [], sinPrecio: true };
  const sub = subtotalDe(unitario, renglon.cantidad, renglon.unidad);
  const unSolo = renglon.cantidad === 1;
  return { unitario, subtotal: sub.valor, pasos: unSolo ? pasos : [...pasos, ...sub.pasos], sinPrecio: false };
}

/** Total de la venta en curso (los renglones sin precio no suman). */
export function totalDeVenta(venta: VentaEnCurso, productos: Producto[]): number {
  return venta.renglones.reduce((suma, r) => suma + (cuentaDeRenglon(r, productos).subtotal ?? 0), 0);
}

export type TotalesDelDia = { total: number; ventas: number; anuladas: number; porMedio: Record<MedioDePago, number> };

/** Lo vendido en una lista de ventas, sin contar las anuladas. */
export function totalesDe(ventas: Venta[]): TotalesDelDia {
  const porMedio: Record<MedioDePago, number> = { efectivo: 0, "mercado-pago": 0, tarjeta: 0, "cuenta-corriente": 0 };
  let total = 0, cuantas = 0, anuladas = 0;
  for (const v of ventas) {
    if (v.anulada) { anuladas += 1; continue; }
    total += v.total; cuantas += 1; porMedio[v.medio] += v.total;
  }
  return { total, ventas: cuantas, anuladas, porMedio };
}

// ---------------------------------------------------------------- Acciones: venta en curso

function conVenta(cambio: (venta: VentaEnCurso) => VentaEnCurso): void {
  cambiarAlmacen((a) => ({ ...a, venta: cambio(a.venta) }));
}

/** Agrega un producto a la venta; si ya estaba, le suma uno. Devuelve el id del renglón. */
export function agregarAVenta(productoId: string): string {
  const producto = estado.productos.find((p) => p.id === productoId);
  if (!producto) return "";
  const existente = estado.venta.renglones.find((r) => r.productoId === productoId);
  if (existente) {
    cambiarRenglon(existente.id, { cantidad: existente.cantidad + 1 });
    return existente.id;
  }
  const id = nuevoId("r");
  conVenta((v) => ({ ...v, renglones: [...v.renglones, { id, productoId, nombre: producto.nombre, unidad: producto.unidad, cantidad: 1, precioAMano: null }] }));
  return id;
}

/** Agrega «algo que no está en productos»: qué es y a cuánto. */
export function agregarLibreAVenta(nombre: string, precio: number): string {
  const id = nuevoId("r");
  conVenta((v) => ({ ...v, renglones: [...v.renglones, { id, productoId: null, nombre, unidad: "unidad", cantidad: 1, precioAMano: precio }] }));
  return id;
}

export function cambiarRenglon(id: string, cambios: Partial<Omit<RenglonDeVenta, "id">>): void {
  conVenta((v) => ({ ...v, renglones: v.renglones.map((r) => (r.id === id ? { ...r, ...cambios } : r)) }));
}

export function quitarRenglon(id: string): void {
  conVenta((v) => ({ ...v, renglones: v.renglones.filter((r) => r.id !== id) }));
}

/** Elige cómo paga. Si deja de ser cuenta corriente, se olvida el cliente. */
export function elegirMedio(medio: MedioDePago | null): void {
  conVenta((v) => ({ ...v, medio, clienteId: medio === "cuenta-corriente" ? v.clienteId : null }));
}

export function elegirCliente(clienteId: string | null): void {
  conVenta((v) => ({ ...v, clienteId }));
}

/** Reemplaza la venta en curso entera (para «Deshacer» y para los estados de maqueta). */
export function ponerVenta(venta: VentaEnCurso): void {
  conVenta(() => venta);
}

export function vaciarVenta(): void {
  ponerVenta(VENTA_VACIA);
}

/**
 * Cobra la venta en curso: la suma a las ventas del día, descuenta el stock y deja la venta
 * vacía. Devuelve la venta registrada, o `null` si falta algo (precio, medio o cliente).
 */
export function cobrarVenta(opciones: { sinConexion?: boolean } = {}): Venta | null {
  const { venta, productos } = estado;
  const cuentas = venta.renglones.map((r) => cuentaDeRenglon(r, productos));
  if (venta.renglones.length === 0 || cuentas.some((c) => c.sinPrecio) || venta.medio === null) return null;
  if (venta.medio === "cuenta-corriente" && venta.clienteId === null) return null;
  const total = cuentas.reduce((suma, c) => suma + (c.subtotal ?? 0), 0);
  const hecha: Venta = {
    id: nuevoId("v"), cuando: new Date(), usuarioId: YO.usuarioId, medio: venta.medio, clienteId: venta.clienteId, total,
    anulada: false, motivo: "", porEnviar: Boolean(opciones.sinConexion),
    renglones: venta.renglones.map((r, i) => ({ nombre: r.nombre, cantidad: r.cantidad, unidad: r.unidad, subtotal: cuentas[i]?.subtotal ?? 0 })),
  };
  const vendido = new Map<string, number>();
  for (const r of venta.renglones) if (r.productoId) vendido.set(r.productoId, (vendido.get(r.productoId) ?? 0) + r.cantidad);
  cambiarAlmacen((a) => ({
    ...a,
    venta: VENTA_VACIA,
    ventas: [hecha, ...a.ventas],
    productos: a.productos.map((p) => (vendido.has(p.id) ? { ...p, stock: p.stock - (vendido.get(p.id) ?? 0) } : p)),
    movimientos: [...[...vendido].map(([productoId, cuanto]) => ({ id: nuevoId("m"), productoId, cuando: "Recién", que: "Venta", cambio: -cuanto })), ...a.movimientos],
    clientes: hecha.medio === "cuenta-corriente" ? a.clientes.map((c) => (c.id === hecha.clienteId ? { ...c, debe: c.debe + total } : c)) : a.clientes,
    actividad: [{ id: nuevoId("h"), usuarioId: YO.usuarioId, que: "cobró una venta", detalle: hecha.renglones.map((r) => `${cantidad(r.cantidad, r.unidad)} de ${r.nombre}`).join(" y "), dia: "Hoy", hora: "Recién", importe: total }, ...a.actividad],
    porEnviar: a.porEnviar + (opciones.sinConexion ? 1 : 0),
  }));
  return hecha;
}

/** Anota la venta en curso como «No llevó» (qué pidió y a cuánto se le ofreció) y la vacía. Devuelve lo que había, para «Deshacer». */
export function anotarNoLlevo(): VentaEnCurso {
  const anterior = estado.venta;
  cambiarAlmacen((a) => ({
    ...a,
    venta: VENTA_VACIA,
    noLlevaron: [...anterior.renglones.map((r) => ({ que: r.nombre, veces: 1, precio: cuentaDeRenglon(r, a.productos).unitario })), ...a.noLlevaron],
  }));
  return anterior;
}

/** Deshace `anotarNoLlevo`: devuelve la venta y borra lo anotado. */
export function deshacerNoLlevo(anterior: VentaEnCurso): void {
  cambiarAlmacen((a) => ({ ...a, venta: anterior, noLlevaron: a.noLlevaron.slice(anterior.renglones.length) }));
}

// ---------------------------------------------------------------- Acciones: lo demás

/** Anula una venta del día (no se puede deshacer) y devuelve la mercadería al stock por nombre. */
export function anularVenta(id: string, motivo: string): void {
  cambiarAlmacen((a) => {
    const venta = a.ventas.find((v) => v.id === id);
    if (!venta || venta.anulada) return a;
    const devuelto = new Map(venta.renglones.map((r) => [r.nombre, r.cantidad]));
    return {
      ...a,
      ventas: a.ventas.map((v) => (v.id === id ? { ...v, anulada: true, motivo } : v)),
      productos: a.productos.map((p) => (devuelto.has(p.nombre) ? { ...p, stock: p.stock + (devuelto.get(p.nombre) ?? 0) } : p)),
      clientes: venta.medio === "cuenta-corriente" ? a.clientes.map((c) => (c.id === venta.clienteId ? { ...c, debe: c.debe - venta.total } : c)) : a.clientes,
    };
  });
}

/** Cambia datos de un producto: `cambiarProducto("thinner", { margen: 50 })`. */
export function cambiarProducto(id: string, cambios: Partial<Omit<Producto, "id">>): void {
  cambiarAlmacen((a) => ({ ...a, productos: a.productos.map((p) => (p.id === id ? { ...p, ...cambios } : p)) }));
}

/** Suma o resta stock y deja el movimiento anotado: `moverStock("thinner", +20, "Compra a Erpa")`. */
export function moverStock(productoId: string, cambio: number, que: string): void {
  cambiarAlmacen((a) => ({
    ...a,
    productos: a.productos.map((p) => (p.id === productoId ? { ...p, stock: p.stock + cambio } : p)),
    movimientos: [{ id: nuevoId("m"), productoId, cuando: "Recién", que, cambio }, ...a.movimientos],
  }));
}

/** Registra un ingreso de mercadería: suma stock, actualiza costos y lo agrega a las compras. */
export function registrarCompra(proveedorId: string, renglones: RenglonComprado[]): Compra {
  const proveedor = estado.proveedores.find((p) => p.id === proveedorId);
  const compra: Compra = {
    id: nuevoId("c"), proveedorId, cuando: "Recién", momento: new Date(), usuarioId: YO.usuarioId, renglones, anulada: false,
  };
  cambiarAlmacen((a) => ({
    ...a,
    compras: [compra, ...a.compras],
    productos: a.productos.map((p) => {
      const r = renglones.find((x) => x.productoId === p.id);
      return r ? { ...p, stock: p.stock + r.cantidad, costo: r.costo } : p;
    }),
    movimientos: [...renglones.map((r) => ({ id: nuevoId("m"), productoId: r.productoId, cuando: "Recién", que: `Compra a ${proveedor?.nombre ?? "proveedor"}`, cambio: r.cantidad })), ...a.movimientos],
  }));
  return compra;
}

/** El proveedor como está AHORA en el almacén (con su última lista y su condición de precios). */
export function proveedorActual(id: string): Proveedor | undefined {
  return estado.proveedores.find((p) => p.id === id);
}

/** Anula una compra (no se puede deshacer): la marca y saca del stock lo que había sumado. */
export function anularCompra(id: string): void {
  cambiarAlmacen((a) => {
    const compra = a.compras.find((c) => c.id === id);
    if (!compra || compra.anulada) return a;
    return {
      ...a,
      compras: a.compras.map((c) => (c.id === id ? { ...c, anulada: true } : c)),
      productos: a.productos.map((p) => {
        const r = compra.renglones.find((x) => x.productoId === p.id);
        return r ? { ...p, stock: p.stock - r.cantidad } : p;
      }),
    };
  });
}
