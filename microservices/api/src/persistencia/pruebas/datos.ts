import { randomUUID } from "node:crypto";
import { sql, type Insertable } from "kysely";
import { hashear } from "../acceso.js";
import { base } from "../conexion.js";
import type { DB } from "../tablas.js";

// Datos de prueba para la capa de datos: cada función da de alta una fila con lo mínimo y devuelve
// su identificador. Lo que la prueba necesita distinto se pasa en `campos`.
type Campos<T extends keyof DB> = Partial<Insertable<DB[T]>>;
const id = () => randomUUID();

async function alta<T extends keyof DB>(tabla: T, fila: Insertable<DB[T]>): Promise<string> {
  await base.insertInto(tabla).values(fila as never).execute();
  return (fila as unknown as { id: string }).id;
}

export const proveedor = (campos: Campos<"proveedor"> = {}) => alta("proveedor", { id: id(), nombre: `Proveedor ${id().slice(0, 8)}`, ...campos });
export const producto = (campos: Campos<"producto"> = {}) => alta("producto", { id: id(), descripcion: `Producto ${id().slice(0, 8)}`, ...campos });
export const cliente = (campos: Campos<"cliente"> = {}) => alta("cliente", { id: id(), nombre: "Cliente", ...campos });
export const sector = (campos: Campos<"sector"> = {}) => alta("sector", { id: id(), nombre: `Sector ${id().slice(0, 8)}`, ...campos });
export const usuario = (campos: Campos<"usuario"> = {}) => alta("usuario", { id: id(), email: `${id()}@ferre.test`, nombre: "Ana", ...campos });

export const lista = (proveedorId: string, campos: Campos<"lista_importada"> = {}) =>
  alta("lista_importada", { id: id(), proveedor_id: proveedorId, archivo_nombre: "lista.xlsx", fecha_lista: "2026-10-01", estado: "pendiente", ...campos });

export const precio = (productoId: string, proveedorId: string, campos: Campos<"precio_proveedor"> = {}) =>
  alta("precio_proveedor", { id: id(), producto_id: productoId, proveedor_id: proveedorId, codigo_proveedor: `C-${id().slice(0, 6)}`, precio_lista: 100, costo_neto: 100, fecha_lista: "2026-10-01", ...campos });

export const movimiento = (productoId: string, cantidad: number, campos: Campos<"movimiento_stock"> = {}) =>
  alta("movimiento_stock", { id: id(), producto_id: productoId, tipo: "compra", cantidad, fecha: new Date(), ...campos });

export const venta = (campos: Campos<"venta"> = {}) => alta("venta", { id: id(), fecha: new Date(), medio_pago: "efectivo", total: 1000, ...campos });

export const renglon = (ventaId: string, campos: Campos<"item_venta"> = {}) =>
  alta("item_venta", { id: id(), venta_id: ventaId, orden: 1, descripcion: "Cinta", cantidad: 1, precio_unitario: 1000, ...campos });

export const compra = (proveedorId: string, campos: Campos<"compra"> = {}) =>
  alta("compra", { id: id(), proveedor_id: proveedorId, fecha: "2026-10-10", comprobante_tipo: "factura", total: 500, ...campos });

export const pedido = (proveedorId: string, campos: Campos<"pedido"> = {}) => alta("pedido", { id: id(), proveedor_id: proveedorId, ...campos });

export const conteo = (sectorId: string, campos: Campos<"conteo"> = {}) => alta("conteo", { id: id(), sector_id: sectorId, ...campos });

export async function rol(permisos: string[], campos: Campos<"rol"> = {}): Promise<string> {
  const rolId = await alta("rol", { id: id(), nombre: `Rol ${id().slice(0, 8)}`, ...campos });
  if (permisos.length) await base.insertInto("rol_permiso").values(permisos.map((permiso) => ({ rol_id: rolId, permiso }))).execute();
  return rolId;
}

// Un usuario con esos permisos (en un rol propio).
export async function usuarioConPermisos(permisos: string[], campos: Campos<"usuario"> = {}): Promise<string> {
  const usuarioId = await usuario(campos);
  await base.insertInto("usuario_rol").values({ usuario_id: usuarioId, rol_id: await rol(permisos) }).execute();
  return usuarioId;
}

// Una sesión de ese usuario, vigente salvo que se diga otra cosa; el token es el que se pasa.
export const sesion = (usuarioId: string, token: string = id(), campos: Campos<"sesion"> = {}) =>
  alta("sesion", { id: id(), usuario_id: usuarioId, token_hash: hashear(token), expira_en: new Date(Date.now() + 86_400_000), ...campos });

// Un puesto (una computadora emparejada con un celular), vigente salvo que se diga otra cosa.
export const puesto = (sesionId: string, campos: Campos<"puesto"> = {}) =>
  alta("puesto", { id: id(), sesion_id: sesionId, codigo_hash: hashear(id()), expira_en: new Date(Date.now() + 86_400_000), vinculado_en: new Date(), ...campos });

// Cuántas filas tiene una tabla.
export const cuantas = async (tabla: keyof DB) => Number((await sql<{ n: string }>`SELECT count(*) AS n FROM ${sql.table(tabla)}`.execute(base)).rows[0]!.n);
