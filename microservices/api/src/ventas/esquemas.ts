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

// POST /ventas/:id/corregir (019): la venta como queda. Los renglones que siguen llevan su `id`; los
// nuevos, no; los que no vienen se quitan. `version` es la marca de modificación que se leyó: si la
// venta cambió mientras tanto, no se pisa. `medio_diferencia`: con qué se cobra si el total sube.
export const correccionDeVenta = z.object({
  version: z.string("Falta la versión de la venta"),
  medio_pago: z.enum(MEDIOS, `El medio de pago es uno de ${MEDIOS.join(", ")}`),
  cliente_id: z.string("El cliente no es válido").nullable().optional(),
  medio_diferencia: z.enum(["efectivo", "mercado_pago", "tarjeta"], "La diferencia se cobra en efectivo, Mercado Pago o tarjeta").optional(),
  dispositivo_id: z.string("El dispositivo no es válido").nullable().optional(),
  items: z.array(z.object({
    id: z.string("El renglón no es válido").regex(UUID, "El renglón no es válido").optional(),
    producto_id: z.string("El producto no es válido").nullable().optional(),
    descripcion: z.string(sinDescripcion).trim().min(1, sinDescripcion),
    cantidad: z.number(cantidad).positive(cantidad),
    precio_unitario: z.number(precio).min(0, precio),
    costo_neto: z.number("El costo no es válido").nullable().optional(),
    margen_aplicado: z.number("El margen no es válido").nullable().optional(),
    explicacion: z.unknown().optional(),
    precio_proveedor_id: z.string("El precio del proveedor no es válido").nullable().optional(),
  }, sinDescripcion), "Para dejar la venta sin productos, se anula").min(1, "Para dejar la venta sin productos, se anula"),
}).superRefine((v, ctx) => {
  if (v.medio_pago === "cuenta_corriente" && !v.cliente_id) ctx.addIssue({ code: "custom", path: ["cliente_id"], message: "Una venta a cuenta corriente necesita el cliente" });
});

// POST /ventas/:id/cambio (019, RF-129 y RF-130): lo que vuelve (renglón de la venta, cuánto y si está
// fallado) y lo que se lleva (renglones como en una venta; sin nada, es una devolución, E18).
// `medio_diferencia`: con qué se cobra si lo nuevo vale más.
const vuelveMal = "Marcá qué vuelve: un renglón de la venta y cuánto";
export const cambioDeVenta = z.object({
  dispositivo_id: z.string("El dispositivo no es válido").nullable().optional(),
  medio_diferencia: z.enum(["efectivo", "mercado_pago", "tarjeta"], "La diferencia se cobra en efectivo, Mercado Pago o tarjeta").optional(),
  vuelve: z.array(z.object({
    item_id: z.string(vuelveMal).regex(UUID, vuelveMal),
    cantidad: z.number(vuelveMal).positive(vuelveMal),
    fallado: z.boolean("Decí si lo que vuelve está fallado"),
  }), vuelveMal).min(1, vuelveMal),
  se_lleva: z.array(z.object({
    producto_id: z.string("El producto no es válido").nullable().optional(),
    descripcion: z.string(sinDescripcion).trim().min(1, sinDescripcion),
    cantidad: z.number(cantidad).positive(cantidad),
    precio_unitario: z.number(precio).min(0, precio),
    costo_neto: z.number("El costo no es válido").nullable().optional(),
    margen_aplicado: z.number("El margen no es válido").nullable().optional(),
    explicacion: z.unknown().optional(),
    precio_proveedor_id: z.string("El precio del proveedor no es válido").nullable().optional(),
  }, sinDescripcion)).default([]),
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
