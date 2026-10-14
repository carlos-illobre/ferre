import { z } from "zod";

// Lo que llega sobre los proveedores (decisión 89). Solo Zod: el contrato toma de acá la forma de
// lo que manda el front, así que este archivo no importa nada del servidor.

const NOMBRE = "Hace falta el nombre";
// Los descuentos van en fracción: 0.25 es 25 %.
const descuento = (campo: string) => {
  const mensaje = `${campo} va entre 0 y 1 (0.25 = 25 %)`;
  return z.number(mensaje).min(0, mensaje).max(1, mensaje).optional();
};

// PATCH /proveedores/:id: cambia lo que viene; un nombre vacío no se toma.
export const cambiosDeProveedor = z.object({
  nombre: z.string(NOMBRE).optional(),
  precios_incluyen_iva: z.boolean("precios_incluyen_iva es sí o no").optional(),
  descuento_general: descuento("descuento_general"),
  descuento_contado: descuento("descuento_contado"),
  lector: z.string("El lector es el nombre de uno de los lectores, o ninguno").nullable().optional(),
  activo: z.boolean("activo es sí o no").optional(),
}, NOMBRE);

// POST /proveedores: el alta, con el nombre obligatorio.
export const proveedorNuevo = cambiosDeProveedor.extend({ nombre: z.string(NOMBRE).trim().min(1, NOMBRE) });
