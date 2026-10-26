import type { MiddlewareHandler } from "hono";
import { base } from "../persistencia/conexion.js";
import * as datos from "../persistencia/apartados.js";

// Lo apartado (specs/014) lo guarda y lo decide Acceso; al aceptarlo, repite acá el pedido original
// con la identidad de quien lo hizo y la marca `X-Apartado` (specs/029). Antes de aplicarlo, Comercial
// revisa lo suyo: un cambio que toca un producto que se unió con otro o se dio de baja no se aplica
// (014-E08), porque la venta o el ajuste quedarían en un producto que ya no se usa. Se dice cuál y por qué.
const UUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

export async function productoQueYaNoEsta(ruta: string, cuerpo: unknown): Promise<string | null> {
  const deLaRuta = ruta.startsWith("/conteos/") ? (ruta.match(UUID) ?? []).slice(1) : (ruta.match(UUID) ?? []);
  const items = (cuerpo as { items?: { producto_id?: string | null }[] } | null)?.items ?? [];
  const ids = [...new Set([...deLaRuta, ...items.map((i) => i.producto_id).filter((id): id is string => typeof id === "string")])];
  if (ids.length === 0) return null;
  const p = (await datos.productosQueYaNoEstan(base, ids))[0];
  if (!p) return null;
  return p.reemplazo ? `«${p.descripcion}» se unió con «${p.reemplazo}». Si querés, descartalo y cargalo de nuevo` : `«${p.descripcion}» se dio de baja. Si querés, descartalo y cargalo de nuevo`;
}

export const revisarLoApartado: MiddlewareHandler = async (c, next) => {
  if (c.req.header("X-Apartado") === "1") {
    const cuerpo = c.req.method === "DELETE" ? null : await c.req.json().catch(() => null);
    const motivo = await productoQueYaNoEsta(c.req.path, cuerpo);
    if (motivo) return c.json({ error: motivo }, 409);
  }
  await next();
};
