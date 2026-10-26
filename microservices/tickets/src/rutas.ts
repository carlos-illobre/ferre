import { timingSafeEqual } from "node:crypto";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { Persona, Reglas } from "./reglas.js";
import type { TicketCreado } from "./contratos/tickets.js";

// Las rutas solo traducen (specs/028): las mismas que tenía Comercial, con las mismas respuestas.
// Todo pedido viene de la puerta, con el token entre servicios y quién es la persona
// (X-Usuario-Id, X-Usuario-Nombre): el navegador nunca habla directo con Tickets.
type Variables = { quien: Persona };

// Se comparan los bytes: un token con letras que no son ASCII tiene otro largo en bytes que en letras.
const igual = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

function quienLlama(c: Context): Persona | null {
  const id = c.req.header("X-Usuario-Id")?.trim();
  if (!id) return null;
  try {
    return { id, nombre: decodeURIComponent(c.req.header("X-Usuario-Nombre") ?? "") || id };
  } catch {
    return null;
  }
}

export function crearApp({ reglas, token }: { reglas: Reglas; token: string }) {
  const app = new Hono<{ Variables: Variables }>();
  app.get("/health", (c) => c.json({ ok: true }));
  // Un error inesperado se dice con las palabras de siempre (las mismas que Comercial).
  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "Algo falló en el servidor. Probá de nuevo; si sigue, avisale al dueño." }, 500);
  });

  app.use("/*", async (c, next) => {
    if (!igual(c.req.header("X-Token-Servicio") ?? "", token)) return c.json({ error: "Tickets solo atiende a la puerta" }, 401);
    const quien = quienLlama(c);
    if (!quien) return c.json({ error: "Hay que iniciar sesión" }, 401);
    c.set("quien", quien);
    await next();
  });

  app.get("/tickets", async (c) => c.json(await reglas.ultimos()));

  // Crear: un formulario con los datos y las fotos (campo `fotos`, repetido). Hasta 5 fotos de 10 MB:
  // el pedido entero no pasa de 55 MB (la puerta corta a los 60).
  app.post("/tickets", bodyLimit({ maxSize: 55 * 1024 * 1024, onError: (c) => c.json({ error: "El ticket pesa demasiado: son hasta 5 fotos de 10 MB" }, 413) }), async (c) => {
    const cuerpo = await c.req.parseBody({ all: true }).catch(() => ({}) as Record<string, unknown>);
    const texto = (clave: string) => (typeof cuerpo[clave] === "string" ? (cuerpo[clave] as string).trim() : "");
    const ticket = { id: texto("id"), tipo: texto("tipo"), descripcion: texto("descripcion"), dispositivo: texto("dispositivo"), version: texto("version"), fotos: ([] as unknown[]).concat(cuerpo["fotos"] ?? []).filter((f): f is File => f instanceof File) };
    const rechazo = reglas.validar(ticket);
    if (rechazo) return c.json({ error: rechazo.error }, rechazo.estado);
    const r = await reglas.crear(ticket, c.get("quien"));
    return r === "repetido" ? c.json({ id: ticket.id, repetido: true } satisfies TicketCreado) : c.json({ id: ticket.id } satisfies TicketCreado, 201);
  });

  app.post("/tickets/:id/resolver", async (c) => {
    // Como en Comercial: un cuerpo que no es JSON es resolver sin nota.
    const cuerpo = ((await c.req.json().catch(() => ({}))) ?? {}) as { nota?: unknown };
    if (cuerpo.nota !== undefined && typeof cuerpo.nota !== "string") return c.json({ error: "La nota es un texto" }, 400);
    if (!(await reglas.resolver(c.req.param("id"), cuerpo.nota, c.get("quien")))) return c.json({ error: "Ese ticket no existe o ya está resuelto" }, 409);
    return c.body(null, 204);
  });

  app.post("/tickets/:id/reabrir", async (c) => {
    if (!(await reglas.reabrir(c.req.param("id"), c.get("quien")))) return c.json({ error: "Ese ticket no existe o ya está abierto" }, 409);
    return c.body(null, 204);
  });

  app.get("/tickets/fotos/:nombre", async (c) => {
    const f = await reglas.foto(c.req.param("nombre"));
    if (!f) return c.json({ error: "No existe esa foto" }, 404);
    return c.body(new Uint8Array(f.contenido), 200, { "Content-Type": f.tipo, "Cache-Control": "private, max-age=31536000, immutable" });
  });
  return app;
}
