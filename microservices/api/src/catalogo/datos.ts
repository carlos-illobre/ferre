import type { Ejecutor } from "../base.js";

// Proveedores: el acceso a los datos (ADR-018).
export const todosLosProveedores = (e: Ejecutor) =>
  e.selectFrom("proveedor").select(["id", "nombre", "precios_incluyen_iva", "descuento_general", "descuento_contado", "lector", "activo", "whatsapp"]).orderBy("nombre").execute();

export type ProveedorNuevo = { id: string; nombre: string; precios_incluyen_iva: boolean; descuento_general: number; descuento_contado: number; lector: string | null };
export const insertarProveedor = (e: Ejecutor, p: ProveedorNuevo) => e.insertInto("proveedor").values(p).execute();

export type CambiosDeProveedor = Partial<{ nombre: string; precios_incluyen_iva: boolean; descuento_general: number; descuento_contado: number; lector: string | null; activo: boolean }>;
// Cambia solo lo que viene; dice si el proveedor existía.
export async function cambiarProveedor(e: Ejecutor, id: string, cambios: CambiosDeProveedor): Promise<boolean> {
  if (Object.keys(cambios).length === 0) return Boolean(await e.selectFrom("proveedor").select("id").where("id", "=", id).executeTakeFirst());
  const r = await e.updateTable("proveedor").set(cambios).where("id", "=", id).executeTakeFirst();
  return r.numUpdatedRows > 0n;
}
