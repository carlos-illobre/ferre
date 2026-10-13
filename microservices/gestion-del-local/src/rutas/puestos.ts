import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import { generarToken, hashear } from "../sesiones.js";
import { adoptarVinculos, anotarDispositivo, computadorasDe, diasDeVinculo, sellarVinculo, soltarAnteriores } from "../emparejamiento.js";
import { fotosQueEsperan } from "./pedidos-de-foto.js";

// Emparejamiento computadora–celular (issue #52, decisión 58). Nace solo cuando el celular
// deja entrar a la computadora (RF-76, ver sesiones.ts) o, con las dos sesiones ya abiertas,
// cuando la computadora muestra un QR y el celular lo lee. Es de los dos dispositivos y del
// usuario (decisión 73): dura los días configurados, sobrevive al cierre de sesión y se corta
// al desvincular. Cada código que el celular escanea se
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
  // Solo se emparejan dos sesiones del mismo usuario (decisión 60): en espejo los dos hacen lo mismo.
  const { rows: duenio } = await pool.query<{ usuario_id: string }>(
    "SELECT s.usuario_id FROM puesto p JOIN sesion s ON s.id = p.sesion_id WHERE p.codigo_hash = $1 AND p.vinculado_en IS NULL AND p.expira_en > now()", [hashear(c.req.param("codigo"))]);
  if (duenio[0] && duenio[0].usuario_id !== usuario.id) return c.json({ error: "Esa computadora tiene la sesión de otra persona. El celular se empareja solo con una computadora donde entraste vos." }, 403);
  const cuerpo = await c.req.json<{ dispositivo_id?: string }>().catch(() => ({}) as { dispositivo_id?: string });
  await anotarDispositivo(pool, sesionId, cuerpo.dispositivo_id);
  const dias = await diasDeVinculo(pool);
  const { rows } = await pool.query<{ id: string; nombre: string | null; sesion_id: string; expira_en: string }>(
    `UPDATE puesto SET vinculado_en = now(), celular_sesion_id = $2, expira_en = now() + ($3 || ' days')::interval
      WHERE codigo_hash = $1 AND vinculado_en IS NULL AND expira_en > now() RETURNING id, nombre, sesion_id, expira_en`,
    [hashear(c.req.param("codigo")), sesionId, String(dias)],
  );
  if (!rows[0]) return c.json({ error: "El código venció o ya se usó. Generá otro en la computadora." }, 404);
  await soltarAnteriores(pool, rows[0].sesion_id, sesionId, rows[0].id);
  await sellarVinculo(pool, rows[0].id);
  await registrarEvento(pool, { tipo: "puesto.vinculado", usuarioId: usuario.id, contenido: { puestoId: rows[0].id, medio: "codigo" } });
  return c.json({ id: rows[0].id, nombre: rows[0].nombre, expira_en: rows[0].expira_en, dias });
});

// Con quién está vinculada esta sesión, mirada desde los dos lados: como computadora (quién
// le manda códigos) y como celular (a quién se los manda). El dispositivo dice quién es: si
// tenía un vínculo dormido de este usuario, se reactiva acá. Cuenta aunque el otro no tenga la
// sesión abierta: está vinculado, solo que el otro no está.
puestos.get("/mio", async (c) => {
  const { id: sesionId, usuario } = c.get("sesion");
  const dispositivo = c.req.query("dispositivo");
  await anotarDispositivo(pool, sesionId, dispositivo);
  await adoptarVinculos(pool, sesionId, usuario.id, dispositivo);
  const { rows } = await pool.query<{ id: string; nombre: string | null; expira_en: string; sesion_id: string }>(
    `SELECT p.id, p.nombre, p.expira_en, p.sesion_id FROM puesto p
      WHERE p.vinculado_en IS NOT NULL AND p.expira_en > now() AND (p.sesion_id = $1 OR p.celular_sesion_id = $1)
      ORDER BY p.vinculado_en DESC`,
    [sesionId],
  );
  const de = (compu: boolean) => { const p = rows.find((r) => (r.sesion_id === sesionId) === compu); return p ? { id: p.id, nombre: p.nombre, expira_en: p.expira_en } : null; };
  return c.json({ comoComputadora: de(true), comoCelular: de(false) });
});

// Cuántos días dura el vínculo: lo ve cualquiera con sesión y lo cambia quien administra sesiones.
puestos.get("/configuracion", async (c) => c.json({ dias: await diasDeVinculo(pool) }));
puestos.put("/configuracion", exigirPermiso("admin.sesiones"), async (c) => {
  const { dias } = await c.req.json<{ dias?: number }>().catch(() => ({}) as { dias?: number });
  if (!Number.isInteger(dias) || dias! < 1 || dias! > 365) return c.json({ error: "Los días tienen que ser un número entero entre 1 y 365" }, 400);
  await pool.query(
    "INSERT INTO configuracion (clave, valor) VALUES ('vinculo.dias', $1) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, actualizado_en = now()", [String(dias)]);
  await registrarEvento(pool, { tipo: "vinculo.dias_cambiados", usuarioId: c.get("sesion").usuario.id, contenido: { dias } });
  return c.json({ dias });
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

// ---------- El espejo (decisión 60) ----------
// Emparejados y con la aplicación abierta en los dos, el celular y la computadora trabajan en
// espejo: están en la misma parte y comparten el trabajo en curso (la venta). Cada lado avisa
// lo que cambia y el servidor se lo pasa al otro; guarda además lo último, para que el que
// llega después lo tome. Cada emparejamiento tiene su propio espejo: lo de una persona no toca
// el de otra. Vive en memoria (un solo proceso, ADR-001): se pierde si el servidor se reinicia.
type Lado = "computadora" | "celular";
// Los trabajos en curso que se comparten: la venta, el ingreso de mercadería, qué pedido a
// proveedor está abierto y sus renglones. El servidor no los entiende: los guarda y los pasa.
const DOCUMENTOS = ["venta", "ingreso", "pedido", "pedido-renglones"];
type Espejo = { parte: string | null; docs: Record<string, unknown>; pausado: boolean; oyentes: Record<Lado, Set<(evento: string, datos: unknown) => void>> };
const espejos = new Map<string, Espejo>();
const MAXIMO_DE_DOCUMENTO = 200_000; // caracteres de un trabajo en curso serializado
function espejoDe(puestoId: string): Espejo {
  let e = espejos.get(puestoId);
  if (!e) { e = { parte: null, docs: {}, pausado: false, oyentes: { computadora: new Set(), celular: new Set() } }; espejos.set(puestoId, e); }
  return e;
}
const presentes = (e: Espejo) => ({ computadora: e.oyentes.computadora.size > 0, celular: e.oyentes.celular.size > 0 });
const otro = (lado: Lado): Lado => (lado === "computadora" ? "celular" : "computadora");
async function ladoDe(puestoId: string, sesionId: string): Promise<Lado | null> {
  const { rows } = await pool.query<{ sesion_id: string; celular_sesion_id: string | null }>(
    "SELECT sesion_id, celular_sesion_id FROM puesto WHERE id = $1 AND vinculado_en IS NOT NULL AND expira_en > now() AND (sesion_id = $2 OR celular_sesion_id = $2)", [puestoId, sesionId]);
  return !rows[0] ? null : rows[0].sesion_id === sesionId ? "computadora" : "celular";
}

// Un lado avisa un cambio: a qué parte fue, cómo quedó la venta, o que pausó o reanudó.
puestos.post("/:id/espejo", async (c) => {
  const lado = await ladoDe(c.req.param("id"), c.get("sesion").id);
  if (!lado) return c.json({ error: "Este dispositivo no está emparejado" }, 404);
  const { tipo, datos } = await c.req.json<{ tipo?: string; datos?: unknown }>().catch(() => ({}) as { tipo?: string; datos?: unknown });
  const e = espejoDe(c.req.param("id"));
  if (tipo === "ir") e.parte = String(datos ?? "").slice(0, 120) || null;
  else if (tipo && DOCUMENTOS.includes(tipo)) { if (JSON.stringify(datos ?? null).length > MAXIMO_DE_DOCUMENTO) return c.json({ error: "Es demasiado grande para compartirlo" }, 413); e.docs[tipo] = datos ?? null; }
  else if (tipo === "pausa") e.pausado = Boolean(datos);
  // Un aviso de algo que terminó («venta cobrada»): se le pasa al otro y no se guarda.
  else if (tipo === "aviso") { if (String(datos ?? "").length > 300) return c.json({ error: "El aviso es demasiado largo" }, 413); }
  else return c.json({ error: "No se entiende el cambio" }, 400);
  // La pausa les llega a los dos; lo demás, al otro.
  for (const l of tipo === "pausa" ? (["computadora", "celular"] as Lado[]) : [otro(lado)]) e.oyentes[l].forEach((o) => o(tipo, tipo === "pausa" ? e.pausado : datos));
  return c.body(null, 204);
});

// Cada lado escucha al otro. Al conectarse recibe cómo está todo, y los dos se enteran de quién está.
puestos.get("/:id/espejo", async (c) => {
  const puestoId = c.req.param("id");
  const lado = await ladoDe(puestoId, c.get("sesion").id);
  if (!lado) return c.json({ error: "Este dispositivo no está emparejado" }, 404);
  return streamSSE(c, async (flujo) => {
    const e = espejoDe(puestoId);
    let abierto = true;
    const oyente = (evento: string, datos: unknown) => { flujo.writeSSE({ event: evento, data: JSON.stringify(datos ?? null) }).catch(() => undefined); };
    const avisarPresencia = () => { const p = presentes(e); for (const l of ["computadora", "celular"] as Lado[]) e.oyentes[l].forEach((o) => o("presencia", p)); };
    e.oyentes[lado].add(oyente);
    await flujo.writeSSE({ event: "estado", data: JSON.stringify({ lado, parte: e.parte, docs: e.docs, pausado: e.pausado, presentes: presentes(e) }) });
    avisarPresencia();
    flujo.onAbort(() => { abierto = false; e.oyentes[lado].delete(oyente); avisarPresencia(); });
    while (abierto) {
      await flujo.writeSSE({ event: "latido", data: String(Date.now()) }).catch(() => { abierto = false; });
      await flujo.sleep(25_000);
    }
  });
});

// Soltar el emparejamiento, desde cualquiera de los dos.
puestos.delete("/:id", async (c) => {
  const { id: sesionId, usuario } = c.get("sesion");
  const { rowCount } = await pool.query("UPDATE puesto SET expira_en = now() WHERE id = $1 AND (sesion_id = $2 OR celular_sesion_id = $2) AND expira_en > now()", [c.req.param("id"), sesionId]);
  if (rowCount) {
    await registrarEvento(pool, { tipo: "puesto.desvinculado", usuarioId: usuario.id, contenido: { puestoId: c.req.param("id") } });
    // A los dos se les avisa, para que dejen el espejo en el momento.
    const e = espejos.get(c.req.param("id"));
    if (e) { for (const l of ["computadora", "celular"] as Lado[]) e.oyentes[l].forEach((o) => o("desvinculado", null)); espejos.delete(c.req.param("id")); }
  }
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
