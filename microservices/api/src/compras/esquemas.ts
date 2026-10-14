import { z } from "zod";

// Lo que llega sobre las compras (decisión 89). Solo Zod: el contrato toma de acá la forma de lo
// que manda el front, así que este archivo no importa nada del servidor.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const COMPROBANTES = ["factura", "remito", "sin_comprobante"] as const;
// El nombre con que queda guardada la foto de un comprobante.
export const ARCHIVO_DE_FOTO = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
const PROVEEDOR = "Elegí el proveedor";
const SIN_PRODUCTOS = "La compra no tiene productos";
// El número del renglón (desde 1) de un problema en `items[i]`.
type Problema = { path?: PropertyKey[] };
const enRenglon = (que: string) => ({ error: (iss: Problema) => `El renglón ${Number(iss.path?.[1]) + 1} ${que}` });
const sinDescripcion = enRenglon("no tiene descripción");
const cantidad = enRenglon("tiene cantidad inválida");
const costo = enRenglon("tiene costo inválido");

// POST /compras. Un renglón sin producto da de alta uno nuevo para ese proveedor. El id lo pone
// el dispositivo, así reenviarla no la duplica.
export const compraNueva = z.object({
  id: z.string("El id de la compra tiene que ser un UUID").regex(UUID, "El id de la compra tiene que ser un UUID").optional(),
  proveedor_id: z.string(PROVEEDOR).regex(UUID, PROVEEDOR),
  pedido_id: z.string("El pedido no es válido").regex(UUID, "El pedido no es válido").nullable().optional(),
  comprobante_tipo: z.enum(COMPROBANTES, `El comprobante es uno de ${COMPROBANTES.join(", ")}`),
  foto: z.string("La foto del comprobante no es válida").regex(ARCHIVO_DE_FOTO, "La foto del comprobante no es válida").nullable().optional(),
  fecha: z.string("La fecha tiene que ser AAAA-MM-DD").regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha tiene que ser AAAA-MM-DD").optional(),
  comprobante_numero: z.string().nullable().optional(),
  nota: z.string().nullable().optional(),
  items: z.array(z.object({
    producto_id: z.string().nullable().optional(),
    descripcion: z.string(sinDescripcion).trim().min(1, sinDescripcion),
    marca: z.string().nullable().optional(),
    cantidad: z.number(cantidad).positive(cantidad),
    costo_unitario: z.number(costo).min(0, costo),
  }, sinDescripcion), SIN_PRODUCTOS).min(1, SIN_PRODUCTOS),
}, PROVEEDOR);

// POST /compras/:id/anular
export const anulacionDeCompra = z.object({ motivo: z.string("El motivo es un texto").optional() });
