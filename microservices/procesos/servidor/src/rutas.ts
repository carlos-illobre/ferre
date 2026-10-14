import { timingSafeEqual } from "node:crypto";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ErrorDeProcesos, type Quien, type Reglas } from "./reglas.js";
import { TOPE_DE_BPMN } from "./bpmn.js";

// Las rutas solo traducen: leen el pedido, llaman a la regla y eligen el código. Quien llama lo
// dice la aplicación que usa el módulo, con el token entre servicios (ADR-019): el navegador
// nunca habla directo con este servicio.

type Variables = { quien: Quien };

const igual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

function quienLlama(c: Context): Quien | null {
  const id = c.req.header("X-Usuario-Id")?.trim();
  if (!id) return null;
  let nombre = id;
  try {
    nombre = decodeURIComponent(c.req.header("X-Usuario-Nombre") ?? "") || id;
  } catch {
    return null;
  }
  const puede = new Set((c.req.header("X-Puede") ?? "").split(",").map((p) => p.trim()));
  const dibujar = puede.has("dibujar");
  return { id, nombre, puede: { dibujar, ver: dibujar || puede.has("ver") } };
}

export function crearApp({ reglas, token }: { reglas: Reglas; token: string }) {
  const app = new Hono<{ Variables: Variables }>();

  app.get("/health", (c) => c.json({ ok: true }));

  const acceso = async (c: Context<{ Variables: Variables }>, next: () => Promise<void>) => {
    if (!igual(c.req.header("X-Token-Servicio") ?? "", token)) return c.json({ error: "Este servicio solo atiende a la aplicación que lo usa" }, 401);
    const quien = quienLlama(c);
    if (!quien) return c.json({ error: "Falta quién hace el pedido" }, 401);
    if (!quien.puede.ver) return c.json({ error: "No tenés permiso para esto. Hace falta: Ver procesos o Dibujar procesos" }, 403);
    c.set("quien", quien);
    await next();
  };
  // Un BPMN puede pesar hasta 5 MB; el pedido, un poco más por el JSON que lo envuelve.
  const tope = bodyLimit({ maxSize: TOPE_DE_BPMN + 512 * 1024, onError: (c) => c.json({ error: "Pesa más de 5 MB" }, 413) });
  for (const ruta of ["/procesos", "/procesos/*"]) {
    app.use(ruta, acceso);
    app.use(ruta, tope);
  }

  const cuerpo = async (c: Context): Promise<Record<string, unknown>> => {
    try {
      const datos = await c.req.json();
      return datos && typeof datos === "object" ? (datos as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };
  const q = (c: Context<{ Variables: Variables }>) => c.get("quien");

  app.get("/procesos", async (c) => c.json(await reglas.listar(q(c))));
  app.post("/procesos", async (c) => c.json(await reglas.crear(await cuerpo(c), q(c)), 201));
  app.get("/procesos/:id", async (c) => c.json(await reglas.leer(c.req.param("id"), q(c))));
  app.patch("/procesos/:id", async (c) => c.json(await reglas.renombrar(c.req.param("id"), (await cuerpo(c)).nombre, q(c))));
  app.delete("/procesos/:id", async (c) => {
    await reglas.borrar(c.req.param("id"), q(c));
    return c.body(null, 204);
  });
  app.put("/procesos/:id/borrador", async (c) => c.json(await reglas.guardarBorrador(c.req.param("id"), await cuerpo(c), q(c))));
  app.delete("/procesos/:id/borrador", async (c) => c.json(await reglas.descartarBorrador(c.req.param("id"), { revision: Number(c.req.query("revision")) }, q(c))));
  app.post("/procesos/:id/vigente", async (c) => c.json(await reglas.marcarVigente(c.req.param("id"), await cuerpo(c), q(c))));
  app.get("/procesos/:id/versiones", async (c) => c.json(await reglas.historial(c.req.param("id"), q(c))));
  app.get("/procesos/:id/versiones/:version", async (c) => c.json(await reglas.version(c.req.param("id"), c.req.param("version"), q(c))));

  app.onError((error, c) => {
    if (error instanceof ErrorDeProcesos) {
      return c.json(error.proceso ? { error: error.message, proceso: error.proceso } : { error: error.message }, error.estado);
    }
    console.error(error);
    return c.json({ error: "Algo falló en el servicio de procesos" }, 500);
  });
  app.notFound((c) => c.json({ error: "No existe" }, 404));
  return app;
}
