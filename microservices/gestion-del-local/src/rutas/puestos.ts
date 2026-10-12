import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";
import { generarToken, hashear } from "../sesiones.js";
import { computadorasDe, DIAS_EMPAREJADO, soltarAnteriores } from "../emparejamiento.js";
import { fotosQueEsperan } from "./pedidos-de-foto.js";

// Emparejamiento computadora–celular (issue #52, decisión 58). Nace solo cuando el celular
// deja entrar a la computadora (RF-76, ver sesiones.ts) o, con las dos sesiones ya abiertas,
// cuando la computadora muestra un QR y el celular lo lee. Dura 30 días o hasta que alguno
// de los dos lo suelte o cierre su sesión. Cada código que el celular escanea se
// guarda y se empuja a la laptop por un flujo de eventos (SSE) que se reconecta solo. Lo
// que la laptop no alcanzó a recibir se le entrega al reconectar.
export const puestos = new Hono();
puestos.use("/*", exigirSesion);

const SEGUNDOS_PENDIENTE = 120; // un código que la computadora no recibió a tiempo ya no sirve
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
  const { rows } = await pool.query<{ id: string; nombre: string | null; sesion_id: string; expira_en: string }>(
    `UPDATE puesto SET vinculado_en = now(), celular_sesion_id = $2, expira_en = now() + ($3 || ' days')::interval
      WHERE codigo_hash = $1 AND vinculado_en IS NULL AND expira_en > now() RETURNING id, nombre, sesion_id, expira_en`,
    [hashear(c.req.param("codigo")), sesionId, String(DIAS_EMPAREJADO)],
  );
  if (!rows[0]) return c.json({ error: "El código venció o ya se usó. Generá otro en la computadora." }, 404);
  await soltarAnteriores(pool, rows[0].sesion_id, sesionId, rows[0].id);
  await registrarEvento(pool, { tipo: "puesto.vinculado", usuarioId: usuario.id, contenido: { puestoId: rows[0].id, medio: "codigo" } });
  return c.json({ id: rows[0].id, nombre: rows[0].nombre, expira_en: rows[0].expira_en, dias: DIAS_EMPAREJADO });
});

// Con quién está emparejada esta sesión, mirada desde los dos lados: como computadora (quién
// le manda códigos) y como celular (a quién se los manda). Solo cuenta si la otra sesión sigue abierta.
puestos.get("/mio", async (c) => {
  const { id: sesionId } = c.get("sesion");
  const { rows } = await pool.query<{ id: string; nombre: string | null; expira_en: string; sesion_id: string }>(
    `SELECT p.id, p.nombre, p.expira_en, p.sesion_id FROM puesto p
       JOIN sesion a ON a.id = p.sesion_id AND a.revocada_en IS NULL AND a.expira_en > now()
       JOIN sesion b ON b.id = p.celular_sesion_id AND b.revocada_en IS NULL AND b.expira_en > now()
      WHERE p.vinculado_en IS NOT NULL AND p.expira_en > now() AND (p.sesion_id = $1 OR p.celular_sesion_id = $1)
      ORDER BY p.vinculado_en DESC`,
    [sesionId],
  );
  const de = (compu: boolean) => { const p = rows.find((r) => (r.sesion_id === sesionId) === compu); return p ? { id: p.id, nombre: p.nombre, expira_en: p.expira_en } : null; };
  return c.json({ comoComputadora: de(true), comoCelular: de(false) });
});

// La computadora le pide a su celular que haga de lector (decisión 59): el celular lo ve como
// un aviso y abre el lector. El pedido vive en memoria dos minutos (un solo proceso, ADR-001).
const SEGUNDOS_PEDIDO_DE_LECTOR = 120;
const lectoresPedidos = new Map<string, number>(); // sesión de la computadora → hasta cuándo vale
puestos.post("/:id/lector", async (c) => {
  const { id: sesionId } = c.get("sesion");
  const { rows } = await pool.query("SELECT id FROM puesto WHERE id = $1 AND sesion_id = $2 AND vinculado_en IS NOT NULL AND expira_en > now()", [c.req.param("id"), sesionId]);
  if (!rows[0]) return c.json({ error: "Esta computadora no tiene un celular emparejado" }, 404);
  lectoresPedidos.set(sesionId, Date.now() + SEGUNDOS_PEDIDO_DE_LECTOR * 1000);
  return c.body(null, 204);
});

// Lo que la computadora emparejada espera de este celular: que haga de lector, o alguna foto.
// El celular lo pregunta cada pocos segundos, con la aplicación a la vista.
puestos.get("/avisos", async (c) => {
  const computadoras = await computadorasDe(pool, c.get("sesion").id);
  const ahora = Date.now();
  return c.json({ lector: computadoras.some((s) => (lectoresPedidos.get(s) ?? 0) > ahora), fotos: fotosQueEsperan(computadoras) });
});
// El celular abrió el lector (o dijo «ahora no»): el pedido ya está atendido.
puestos.delete("/avisos/lector", async (c) => {
  for (const s of await computadorasDe(pool, c.get("sesion").id)) lectoresPedidos.delete(s);
  return c.body(null, 204);
});

// Soltar el emparejamiento, desde cualquiera de los dos.
puestos.delete("/:id", async (c) => {
  const { id: sesionId, usuario } = c.get("sesion");
  const { rowCount } = await pool.query("UPDATE puesto SET expira_en = now() WHERE id = $1 AND (sesion_id = $2 OR celular_sesion_id = $2) AND expira_en > now()", [c.req.param("id"), sesionId]);
  if (rowCount) await registrarEvento(pool, { tipo: "puesto.desvinculado", usuarioId: usuario.id, contenido: { puestoId: c.req.param("id") } });
  return c.body(null, 204);
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
  // `nuevos=1`: quien escucha quiere solo lo que se escanee de acá en más (la ficha que espera
  // el código de un producto, la búsqueda). Lo que había quedado sin entregar se da por
  // entregado: si no, un código de hace un rato terminaría guardado en el producto que no es.
  const soloNuevos = c.req.query("nuevos") === "1";
  if (soloNuevos) await pool.query("UPDATE codigo_escaneado SET entregado_en = now() WHERE puesto_id = $1 AND entregado_en IS NULL", [puestoId]);
  return streamSSE(c, async (flujo) => {
    const { rows: pendientes } = soloNuevos ? { rows: [] } : await pool.query<{ id: string; codigo: string; creado_en: string }>(
      // Lo que no llegó «hace un momento» ya no se entrega: aparecería en una venta que no es.
      "SELECT id, codigo, creado_en FROM codigo_escaneado WHERE puesto_id = $1 AND entregado_en IS NULL AND creado_en > now() - ($2 || ' seconds')::interval ORDER BY creado_en",
      [puestoId, String(SEGUNDOS_PENDIENTE)],
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
