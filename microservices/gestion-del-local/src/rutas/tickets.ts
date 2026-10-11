import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { pool } from "../db.js";
import { config } from "../config.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";

// Tickets (RF-80): errores y mejoras que reporta quien usa el sistema, con texto y fotos.
// Todos los usuarios ven todos. Las fotos se piden con sesión: son capturas de pantalla y
// pueden mostrar datos del negocio, a diferencia de las fotos de productos.
export const tickets = new Hono();
tickets.use("/*", exigirSesion);

const TIPOS_DE_FOTO: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const MAXIMO_DE_FOTOS = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const carpetaTickets = () => path.join(config.carpetaListas, "tickets");

tickets.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT t.id, t.tipo, t.descripcion, t.dispositivo, t.version, t.creado_en, t.estado, t.resuelto_en, t.nota,
            u.nombre AS usuario, r.nombre AS resuelto_por,
            COALESCE((SELECT json_agg('/tickets/fotos/' || f.archivo ORDER BY f.orden) FROM ticket_foto f WHERE f.ticket_id = t.id), '[]'::json) AS fotos
       FROM ticket t JOIN usuario u ON u.id = t.usuario_id LEFT JOIN usuario r ON r.id = t.resuelto_por
      ORDER BY t.creado_en DESC LIMIT 200`,
  );
  return c.json(rows);
});

// Crear: un formulario con los datos y las fotos (campo `fotos`, repetido). El id lo pone
// el dispositivo, así un ticket escrito sin conexión se puede reenviar sin duplicarlo.
tickets.post("/", async (c) => {
  const cuerpo = await c.req.parseBody({ all: true });
  const texto = (clave: string) => (typeof cuerpo[clave] === "string" ? (cuerpo[clave] as string).trim() : "");
  const id = texto("id");
  const tipo = texto("tipo");
  const descripcion = texto("descripcion");
  if (!UUID.test(id)) return c.json({ error: "Falta el identificador del ticket" }, 400);
  if (tipo !== "error" && tipo !== "mejora") return c.json({ error: "Decí si es un error o una mejora" }, 400);
  if (descripcion.length < 3) return c.json({ error: "Contá qué pasó o qué te gustaría, aunque sea en una línea" }, 400);
  if (descripcion.length > 5000) return c.json({ error: "El texto es demasiado largo: resumilo en menos de 5.000 letras" }, 400);
  const adjuntos = ([] as unknown[]).concat(cuerpo["fotos"] ?? []).filter((f): f is File => f instanceof File);
  if (adjuntos.length > MAXIMO_DE_FOTOS) return c.json({ error: `Son hasta ${MAXIMO_DE_FOTOS} fotos por ticket` }, 400);
  for (const f of adjuntos) {
    if (!TIPOS_DE_FOTO[f.type]) return c.json({ error: "Las fotos tienen que ser jpeg, png o webp" }, 400);
    if (f.size > 10 * 1024 * 1024) return c.json({ error: "Una foto pesa más de 10 MB" }, 413);
  }

  const usuarioId = c.get("sesion").usuario.id;
  const { rowCount } = await pool.query(
    `INSERT INTO ticket (id, tipo, descripcion, dispositivo, version, usuario_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [id, tipo, descripcion, texto("dispositivo").slice(0, 80) || null, texto("version").slice(0, 80) || null, usuarioId],
  );
  // Ya había llegado (un reenvío): no se guarda nada de nuevo.
  if (!rowCount) return c.json({ id, repetido: true });

  await mkdir(carpetaTickets(), { recursive: true });
  for (const [orden, f] of adjuntos.entries()) {
    const archivo = `${randomUUID()}${TIPOS_DE_FOTO[f.type]}`;
    await writeFile(path.join(carpetaTickets(), archivo), Buffer.from(await f.arrayBuffer()));
    await pool.query("INSERT INTO ticket_foto (ticket_id, orden, archivo) VALUES ($1, $2, $3)", [id, orden, archivo]);
  }
  await registrarEvento(pool, { tipo: "ticket.creado", usuarioId, contenido: { id, tipo, fotos: adjuntos.length } });
  return c.json({ id }, 201);
});

tickets.post("/:id/resolver", async (c) => {
  const { nota } = await c.req.json<{ nota?: string }>().catch(() => ({}) as { nota?: string });
  const usuarioId = c.get("sesion").usuario.id;
  const { rowCount } = await pool.query(
    "UPDATE ticket SET estado = 'resuelto', resuelto_en = now(), resuelto_por = $2, nota = $3 WHERE id = $1 AND estado = 'abierto'",
    [c.req.param("id"), usuarioId, nota?.trim().slice(0, 2000) || null],
  );
  if (!rowCount) return c.json({ error: "Ese ticket no existe o ya está resuelto" }, 409);
  await registrarEvento(pool, { tipo: "ticket.resuelto", usuarioId, contenido: { id: c.req.param("id") } });
  return c.body(null, 204);
});

tickets.post("/:id/reabrir", async (c) => {
  const usuarioId = c.get("sesion").usuario.id;
  const { rowCount } = await pool.query(
    "UPDATE ticket SET estado = 'abierto', resuelto_en = NULL, resuelto_por = NULL WHERE id = $1 AND estado = 'resuelto'",
    [c.req.param("id")],
  );
  if (!rowCount) return c.json({ error: "Ese ticket no existe o ya está abierto" }, 409);
  await registrarEvento(pool, { tipo: "ticket.reabierto", usuarioId, contenido: { id: c.req.param("id") } });
  return c.body(null, 204);
});

tickets.get("/fotos/:nombre", async (c) => {
  const nombre = c.req.param("nombre");
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(nombre)) return c.json({ error: "No existe esa foto" }, 404);
  const contenido = await readFile(path.join(carpetaTickets(), nombre)).catch(() => null);
  if (!contenido) return c.json({ error: "No existe esa foto" }, 404);
  const tipo = nombre.endsWith(".png") ? "image/png" : nombre.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return c.body(contenido, 200, { "Content-Type": tipo, "Cache-Control": "private, max-age=31536000, immutable" });
});
