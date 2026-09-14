import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";
import { generarToken, hashear } from "../sesiones.js";

// Vinculación laptop–celular (issue #52). La laptop crea el puesto y muestra el QR; el
// celular, ya autenticado, lo lee y queda vinculado 12 horas; cada código que escanea se
// guarda y se empuja a la laptop por un flujo de eventos (SSE) que se reconecta solo. Lo
// que la laptop no alcanzó a recibir se le entrega al reconectar.
export const puestos = new Hono();
puestos.use("/*", exigirSesion);

const HORAS_VINCULO = 12;
const MINUTOS_QR = 5;

// Un solo proceso (ADR-001): los oyentes viven en memoria.
type Oyente = (codigo: { id: string; codigo: string; creado_en: string }) => void;
const oyentes = new Map<string, Set<Oyente>>();
function avisar(puestoId: string, c: { id: string; codigo: string; creado_en: string }) {
  oyentes.get(puestoId)?.forEach((o) => o(c));
}

// La laptop pide un puesto: devuelve el código para el QR.
puestos.post("/", async (c) => {
  const { id: sesionId } = c.get("sesion");
  const cuerpo = await c.req.json<{ nombre?: string }>().catch(() => ({}) as { nombre?: string });
  const id = randomUUID();
  const codigo = generarToken();
  await pool.query(
    `INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, expira_en) VALUES ($1, $2, $3, $4, now() + ($5 || ' minutes')::interval)`,
    [id, sesionId, hashear(codigo), cuerpo.nombre?.trim() || null, String(MINUTOS_QR)],
  );
  return c.json({ id, codigo, expiraEnSegundos: MINUTOS_QR * 60 }, 201);
});

// El celular lee el QR y se vincula. Desde acá el puesto dura 12 horas.
puestos.post("/:codigo/vincular", async (c) => {
  const { id: sesionId, usuario } = c.get("sesion");
  const { rows } = await pool.query<{ id: string; nombre: string | null }>(
    `UPDATE puesto SET vinculado_en = now(), celular_sesion_id = $2, expira_en = now() + ($3 || ' hours')::interval
      WHERE codigo_hash = $1 AND vinculado_en IS NULL AND expira_en > now() RETURNING id, nombre`,
    [hashear(c.req.param("codigo")), sesionId, String(HORAS_VINCULO)],
  );
  if (!rows[0]) return c.json({ error: "El código venció o ya se usó. Generá otro en la computadora." }, 404);
  await registrarEvento(pool, { tipo: "puesto.vinculado", usuarioId: usuario.id, contenido: { puestoId: rows[0].id } });
  return c.json({ id: rows[0].id, nombre: rows[0].nombre, horas: HORAS_VINCULO });
});

// El celular manda un código escaneado.
puestos.post("/:id/codigos", async (c) => {
  const { id: sesionId } = c.get("sesion");
  const cuerpo = await c.req.json<{ codigo?: string }>().catch(() => ({}) as { codigo?: string });
  const codigo = cuerpo.codigo?.trim();
  if (!codigo) return c.json({ error: "Falta el código" }, 400);
  const { rows } = await pool.query("SELECT id FROM puesto WHERE id = $1 AND celular_sesion_id = $2 AND expira_en > now()", [c.req.param("id"), sesionId]);
  if (!rows[0]) return c.json({ error: "Este celular no está vinculado a esa computadora, o la vinculación venció" }, 403);
  const id = randomUUID();
  const creado_en = new Date().toISOString();
  await pool.query("INSERT INTO codigo_escaneado (id, puesto_id, codigo, creado_en) VALUES ($1, $2, $3, $4)", [id, c.req.param("id"), codigo, creado_en]);
  avisar(c.req.param("id"), { id, codigo, creado_en });
  return c.json({ id }, 201);
});

// La laptop confirma que recibió un código.
puestos.post("/:id/codigos/:codigoId/recibido", async (c) => {
  const { id: sesionId } = c.get("sesion");
  await pool.query(
    "UPDATE codigo_escaneado SET entregado_en = now() WHERE id = $2 AND puesto_id = $1 AND EXISTS (SELECT 1 FROM puesto WHERE id = $1 AND sesion_id = $3)",
    [c.req.param("id"), c.req.param("codigoId"), sesionId],
  );
  return c.body(null, 204);
});

// Estado del puesto (¿ya se vinculó el celular?).
puestos.get("/:id", async (c) => {
  const { id: sesionId } = c.get("sesion");
  const { rows } = await pool.query("SELECT id, nombre, vinculado_en, expira_en FROM puesto WHERE id = $1 AND (sesion_id = $2 OR celular_sesion_id = $2)", [c.req.param("id"), sesionId]);
  if (!rows[0]) return c.json({ error: "No existe ese puesto" }, 404);
  return c.json({ ...rows[0], vigente: new Date(rows[0].expira_en).getTime() > Date.now() });
});

// Flujo de eventos hacia la laptop: primero lo pendiente, después lo que vaya llegando.
// Latido cada 25 s para que el proxy no corte la conexión.
puestos.get("/:id/eventos", async (c) => {
  const { id: sesionId } = c.get("sesion");
  const puestoId = c.req.param("id");
  const { rows } = await pool.query("SELECT id FROM puesto WHERE id = $1 AND sesion_id = $2 AND expira_en > now()", [puestoId, sesionId]);
  if (!rows[0]) return c.json({ error: "No existe ese puesto o venció" }, 404);
  return streamSSE(c, async (flujo) => {
    const { rows: pendientes } = await pool.query<{ id: string; codigo: string; creado_en: string }>(
      "SELECT id, codigo, creado_en FROM codigo_escaneado WHERE puesto_id = $1 AND entregado_en IS NULL ORDER BY creado_en",
      [puestoId],
    );
    for (const p of pendientes) await flujo.writeSSE({ event: "codigo", data: JSON.stringify(p), id: p.id });
    let abierto = true;
    const oyente: Oyente = (codigo) => { flujo.writeSSE({ event: "codigo", data: JSON.stringify(codigo), id: codigo.id }).catch(() => undefined); };
    if (!oyentes.has(puestoId)) oyentes.set(puestoId, new Set());
    oyentes.get(puestoId)!.add(oyente);
    flujo.onAbort(() => { abierto = false; oyentes.get(puestoId)?.delete(oyente); });
    while (abierto) {
      await flujo.writeSSE({ event: "latido", data: String(Date.now()) }).catch(() => { abierto = false; });
      await flujo.sleep(25_000);
    }
  });
});
