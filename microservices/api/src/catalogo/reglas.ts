import { randomUUID } from "node:crypto";
import { base } from "../persistencia/conexion.js";
import { anotarEvento } from "../persistencia/eventos.js";
import * as datos from "../persistencia/catalogo.js";
import type { z } from "zod";
import type { Proveedor } from "../contratos/proveedores.js";
import type { cambiosDeProveedor, proveedorNuevo } from "./esquemas.js";
import type { Enviable } from "../enviable.js";

// Proveedores con su configuración de costo (issue #11): si sus precios incluyen IVA,
// descuento general, descuento por contado, y qué lector entiende su planilla. Lo que llega ya
// viene validado con su esquema (`esquemas.ts`).

export const proveedores = (): Promise<Enviable<Proveedor>[]> => datos.todosLosProveedores(base);

// Alta: `null` si ya existe uno con ese nombre.
export async function alta(p: z.output<typeof proveedorNuevo>, usuarioId: string): Promise<string | null> {
  const id = randomUUID();
  try {
    await datos.insertarProveedor(base, { id, nombre: p.nombre, precios_incluyen_iva: p.precios_incluyen_iva ?? false, descuento_general: p.descuento_general ?? 0, descuento_contado: p.descuento_contado ?? 0, lector: p.lector ?? null });
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return null;
    throw e;
  }
  await anotarEvento(base, { tipo: "proveedor.creado", usuarioId, contenido: { id, ...p } });
  return id;
}

// Cambia lo que viene; un nombre vacío no se toma. Dice si el proveedor existía.
export async function modificar(id: string, p: z.output<typeof cambiosDeProveedor>, usuarioId: string): Promise<boolean> {
  const cambios: datos.CambiosDeProveedor = {};
  if (p.nombre?.trim()) cambios.nombre = p.nombre.trim();
  if (p.precios_incluyen_iva !== undefined) cambios.precios_incluyen_iva = p.precios_incluyen_iva;
  if (p.descuento_general !== undefined) cambios.descuento_general = p.descuento_general;
  if (p.descuento_contado !== undefined) cambios.descuento_contado = p.descuento_contado;
  if ("lector" in p) cambios.lector = p.lector ?? null;
  if (p.activo !== undefined) cambios.activo = p.activo;
  if (!(await datos.cambiarProveedor(base, id, cambios))) return false;
  await anotarEvento(base, { tipo: "proveedor.modificado", usuarioId, contenido: { id, cambios: p } });
  return true;
}
