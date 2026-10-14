import { z } from "zod";

// Lo que llega sobre las ventas y las consultas (decisión 89). Solo Zod: el contrato toma de acá
// la forma de lo que manda el front, así que este archivo no importa nada del servidor.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MEDIOS = ["efectivo", "mercado_pago", "tarjeta", "cuenta_corriente"] as const;
const SIN_PRODUCTOS = "La venta no tiene productos";
// El número del ítem (desde 1) de un problema en `items[i]`.
type Problema = { path?: PropertyKey[] };
const enItem = (que: string) => ({ error: (iss: Problema) => `El ítem ${Number(iss.path?.[1]) + 1} ${que}` });
const sinDescripcion = enItem("no tiene descripción");
const cantidad = enItem("tiene cantidad inválida");
const precio = enItem("tiene precio inválido");

// POST /ventas. El id lo genera el cliente: una venta hecha sin conexión se reenvía y no se
// duplica. Cada renglón lleva lo que se cobró: precio, costo, margen y explicación de ese
// momento (decisión 86).
export const ventaNueva = z.object({
  id: z.string("El id de la venta tiene que ser un UUID").regex(UUID, "El id de la venta tiene que ser un UUID").optional(),
  medio_pago: z.enum(MEDIOS, `El medio de pago es uno de ${MEDIOS.join(", ")}`),
  cliente_id: z.string("El cliente no es válido").nullable().optional(),
  fecha: z.string("La fecha no es válida").optional(),
  dispositivo_id: z.string("El dispositivo no es válido").nullable().optional(),
  items: z.array(z.object({
    producto_id: z.string("El producto no es válido").nullable().optional(),
    descripcion: z.string(sinDescripcion).trim().min(1, sinDescripcion),
    cantidad: z.number(cantidad).positive(cantidad),
    precio_unitario: z.number(precio).min(0, precio),
    costo_neto: z.number("El costo no es válido").nullable().optional(),
    margen_aplicado: z.number("El margen no es válido").nullable().optional(),
    explicacion: z.unknown().optional(),
    precio_proveedor_id: z.string("El precio del proveedor no es válido").nullable().optional(),
  }, sinDescripcion), SIN_PRODUCTOS).min(1, SIN_PRODUCTOS),
}, SIN_PRODUCTOS).superRefine((v, ctx) => {
  if (v.medio_pago === "cuenta_corriente" && !v.cliente_id) ctx.addIssue({ code: "custom", path: ["cliente_id"], message: "Una venta a cuenta corriente necesita el cliente" });
});

// POST /ventas/:id/anular
export const anulacionDeVenta = z.object({ motivo: z.string("El motivo es un texto").optional() });

// POST /consultas: «no llevó», cada producto consultado con lo que se le ofreció. Los renglones
// sin descripción no cuentan.
const NADA = "No hay nada que registrar";
export const consultaNueva = z.object({
  items: z.array(z.object({
    producto_id: z.string().nullable().optional(),
    descripcion: z.string(NADA).optional(),
    precio_ofrecido: z.number("El precio ofrecido es un número").nullable().optional(),
  }, NADA), NADA).min(1, NADA),
  motivo: z.string("El motivo es un texto").optional(),
  dispositivo_id: z.string().nullable().optional(),
}, NADA);
