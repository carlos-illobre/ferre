import { z } from "zod";

// Lo que llega sobre los pedidos a los proveedores (decisión 89). Solo Zod: el contrato toma de
// acá la forma de lo que manda el front, así que este archivo no importa nada del servidor.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PROVEEDOR = "Elegí el proveedor";
// El número del renglón (desde 1) de un problema en `items[i]`.
const renglon = (iss: { path?: PropertyKey[] }) => Number(iss.path?.[1]) + 1;
const sinProducto = { error: (iss: { path?: PropertyKey[] }) => `El renglón ${renglon(iss)} no tiene producto` };
const cantidadInvalida = { error: (iss: { path?: PropertyKey[] }) => `El renglón ${renglon(iss)} tiene cantidad inválida` };

// PUT /pedidos/:id: guarda el borrador entero (el id va en la dirección). Cada producto una
// sola vez, con cantidad mayor que cero.
export const borradorDePedido = z.object({
  id: z.string().regex(UUID, "El id del pedido tiene que ser un UUID"),
  proveedor_id: z.string(PROVEEDOR).regex(UUID, PROVEEDOR),
  items: z.array(z.object({
    producto_id: z.string(sinProducto).regex(UUID, sinProducto),
    cantidad: z.number(cantidadInvalida).positive(cantidadInvalida),
  }, sinProducto), "Los renglones no son válidos").optional(),
}, PROVEEDOR).superRefine((v, ctx) => {
  const vistos = new Set<string>();
  for (const [i, it] of (v.items ?? []).entries()) {
    if (vistos.has(it.producto_id)) ctx.addIssue({ code: "custom", path: ["items", i], message: `El renglón ${i + 1} repite un producto que ya está en el pedido` });
    vistos.add(it.producto_id);
  }
});

// POST /pedidos/:id/enviar: con el WhatsApp del proveedor, si se lo manda por ahí.
export const envioDePedido = z.object({ whatsapp: z.union([z.string(), z.number()], "El WhatsApp es un número de teléfono").transform(String).optional() });
