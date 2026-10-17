import type { Context } from "hono";
import type { z } from "zod";

// Lee el cuerpo JSON de un pedido y lo valida con el esquema de Zod del tema (decisión 89). Un
// cuerpo que no es JSON se toma como vacío, así el esquema dice qué falta. Si no cumple, el
// motivo es el mensaje del esquema, en castellano, que la ruta devuelve con un 400.
export async function leerCuerpo<E extends z.ZodType>(c: Context, esquema: E): Promise<{ ok: true; datos: z.output<E> } | { ok: false; error: string }> {
  const crudo: unknown = await c.req.json().catch(() => ({}));
  const r = esquema.safeParse(crudo);
  return r.success ? { ok: true, datos: r.data } : { ok: false, error: r.error.issues[0]?.message ?? "El pedido no tiene la forma esperada" };
}
