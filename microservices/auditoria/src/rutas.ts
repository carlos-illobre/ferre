import { timingSafeEqual } from "node:crypto";
import { Hono, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { Reglas } from "./reglas.js";

// Las rutas solo traducen (specs/027). Todo pedido trae el token entre servicios: las entregas, de
// los servicios por la red interna; los reportes, de la puerta, que dice quién es y qué permisos
// tiene (X-Permisos). Qué permiso deja ver los reportes lo dice el .env (PERMISO_REPORTES).
const igual = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export function crearApp({ reglas, token, permisoReportes }: { reglas: Reglas; token: string; permisoReportes: string }) {
  const app = new Hono();
  app.get("/health", (c) => c.json({ ok: true }));

  const conToken: MiddlewareHandler = async (c, next) => {
    if (!igual(c.req.header("X-Token-Servicio") ?? "", token)) return c.json({ error: "Auditoría solo atiende a los servicios y a la puerta" }, 401);
    await next();
  };
  const puedeVerReportes: MiddlewareHandler = async (c, next) => {
    const permisos = (c.req.header("X-Permisos") ?? "").split(",").map((p) => p.trim());
    if (!permisos.includes(permisoReportes)) return c.json({ error: "No tenés permiso para ver quién hizo qué" }, 403);
    await next();
  };

  // Un lote de 100 eventos de hasta 16 KB cada uno, con margen.
  app.post("/v1/eventos", conToken, bodyLimit({ maxSize: 2 * 1024 * 1024, onError: (c) => c.json({ error: "El lote es demasiado grande" }, 413) }), async (c) => {
    const r = await reglas.recibir(await c.req.json().catch(() => null));
    return r.ok ? c.json(r.cuerpo) : c.json({ error: r.error }, 400);
  });

  app.get("/auditoria", conToken, puedeVerReportes, async (c) => {
    const q = c.req.query();
    const r = await reglas.reporte({ usuario: q.usuario || null, grupo: q.grupo || null, tipo: q.tipo || null, desde: q.desde || null, hasta: q.hasta || null }, q.pagina);
    return r.ok ? c.json(r.cuerpo) : c.json({ error: r.error }, 400);
  });
  app.get("/auditoria/grupos", conToken, puedeVerReportes, async (c) => c.json(await reglas.grupos()));
  return app;
}
