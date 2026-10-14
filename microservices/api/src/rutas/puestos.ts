import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../acceso/reglas.js";
import * as espejo from "../acceso/espejo.js";
import { fotosQueEsperan } from "./pedidos-de-foto.js";
import { responder } from "./sesiones.js";

// Vínculo computadora–celular (issue #52, decisiones 58, 60 y 73). La ruta solo traduce
// (ADR-018); las reglas están en `acceso/reglas.ts`, el espejo en `acceso/espejo.ts`.
export const puestos = new Hono();
puestos.use("/*", exigirSesion);

// La laptop pide un código para el QR.
puestos.post("/", async (c) => {
  const cuerpo = await c.req.json<{ nombre?: string }>().catch(() => ({}) as { nombre?: string });
  return c.json(await reglas.codigoParaVincular(c.get("sesion").id, cuerpo.nombre), 201);
});

// El celular lee el QR y se vincula.
puestos.post("/:codigo/vincular", async (c) => {
  const cuerpo = await c.req.json<{ dispositivo_id?: string }>().catch(() => ({}) as { dispositivo_id?: string });
  return responder(c, await reglas.vincular(c.get("sesion"), c.req.param("codigo"), cuerpo.dispositivo_id));
});

puestos.get("/mio", async (c) => c.json(await reglas.vinculosDe(c.get("sesion"), c.req.query("dispositivo"))));

// Cuántos días dura el vínculo: lo ve cualquiera con sesión y lo cambia quien administra sesiones.
puestos.get("/configuracion", async (c) => c.json({ dias: await reglas.diasDelVinculo() }));
puestos.put("/configuracion", exigirPermiso("admin.sesiones"), async (c) => {
  const { dias } = await c.req.json<{ dias?: number }>().catch(() => ({}) as { dias?: number });
  return responder(c, await reglas.cambiarDiasDelVinculo(dias, c.get("sesion").usuario.id));
});

// La computadora le pide a su celular que haga de lector (decisión 59).
puestos.post("/:id/lector", async (c) => {
  const sesionId = c.get("sesion").id;
  if (!(await reglas.esComputadoraVinculada(c.req.param("id"), sesionId))) return c.json({ error: "Esta computadora no tiene un celular emparejado" }, 404);
  espejo.pedirLector(sesionId);
  return c.body(null, 204);
});

// Lo que la computadora emparejada espera de este celular: que haga de lector, o alguna foto.
puestos.get("/avisos", async (c) => {
  const computadoras = await reglas.computadorasDelCelular(c.get("sesion").id);
  return c.json({ lector: espejo.esperanLector(computadoras), fotos: fotosQueEsperan(computadoras) });
});
puestos.delete("/avisos/lector", async (c) => {
  espejo.lectorAtendido(await reglas.computadorasDelCelular(c.get("sesion").id));
  return c.body(null, 204);
});

// ---------- El espejo ----------
puestos.post("/:id/espejo", async (c) => {
  const lado = await reglas.ladoEnElPuesto(c.req.param("id"), c.get("sesion").id);
  if (!lado) return c.json({ error: "Este dispositivo no está emparejado" }, 404);
  const { tipo, datos } = await c.req.json<{ tipo?: string; datos?: unknown }>().catch(() => ({}) as { tipo?: string; datos?: unknown });
  const error = espejo.cambio(c.req.param("id"), lado, tipo, datos);
  return error ? c.json({ error: error.error }, error.estado) : c.body(null, 204);
});

// Cada lado escucha al otro. Latido cada 25 s para que el proxy no corte la conexión.
puestos.get("/:id/espejo", async (c) => {
  const puestoId = c.req.param("id");
  const lado = await reglas.ladoEnElPuesto(puestoId, c.get("sesion").id);
  if (!lado) return c.json({ error: "Este dispositivo no está emparejado" }, 404);
  return streamSSE(c, async (flujo) => {
    let abierto = true;
    const oyente = (evento: string, datos: unknown) => { flujo.writeSSE({ event: evento, data: JSON.stringify(datos ?? null) }).catch(() => undefined); };
    const { estado, avisarPresencia, dejar } = espejo.escuchar(puestoId, lado, oyente);
    await flujo.writeSSE({ event: "estado", data: JSON.stringify(estado) });
    avisarPresencia();
    flujo.onAbort(() => { abierto = false; dejar(); });
    while (abierto) {
      await flujo.writeSSE({ event: "latido", data: String(Date.now()) }).catch(() => { abierto = false; });
      await flujo.sleep(25_000);
    }
  });
});

// Soltar el emparejamiento, desde cualquiera de los dos.
puestos.delete("/:id", async (c) => {
  if (await reglas.soltar(c.req.param("id"), c.get("sesion"))) espejo.cerrar(c.req.param("id"));
  return c.body(null, 204);
});

// El celular manda un código escaneado; la computadora lo recibe por su flujo.
puestos.post("/:id/codigos", async (c) => {
  const cuerpo = await c.req.json<{ codigo?: string }>().catch(() => ({}) as { codigo?: string });
  const r = await reglas.mandarCodigo(c.req.param("id"), c.get("sesion").id, cuerpo.codigo);
  if (!r.ok) return c.json({ error: r.error }, r.estado);
  espejo.avisarCodigo(c.req.param("id"), r.cuerpo!);
  return c.json({ id: r.cuerpo!.id }, 201);
});

puestos.post("/:id/codigos/:codigoId/recibido", async (c) => {
  await reglas.codigoRecibido(c.req.param("id"), c.req.param("codigoId"), c.get("sesion").id);
  return c.body(null, 204);
});

puestos.get("/:id", async (c) => {
  const p = await reglas.estadoDelPuesto(c.req.param("id"), c.get("sesion").id);
  return p ? c.json(p) : c.json({ error: "No existe ese puesto" }, 404);
});

// Flujo de códigos hacia la laptop: primero lo pendiente, después lo que vaya llegando.
// `nuevos=1`: solo lo que se escanee de acá en más.
puestos.get("/:id/eventos", async (c) => {
  const puestoId = c.req.param("id");
  const flujoDeCodigos = await reglas.abrirFlujoDeCodigos(puestoId, c.get("sesion").id, c.req.query("nuevos") === "1");
  if (!flujoDeCodigos) return c.json({ error: "No existe ese puesto o venció" }, 404);
  return streamSSE(c, async (flujo) => {
    for (const p of await flujoDeCodigos.pendientes()) await flujo.writeSSE({ event: "codigo", data: JSON.stringify(p), id: p.id });
    let abierto = true;
    const dejar = espejo.escucharCodigos(puestoId, (codigo) => { flujo.writeSSE({ event: "codigo", data: JSON.stringify(codigo), id: codigo.id }).catch(() => undefined); });
    flujo.onAbort(() => { abierto = false; dejar(); });
    while (abierto) {
      await flujo.writeSSE({ event: "latido", data: String(Date.now()) }).catch(() => { abierto = false; });
      await flujo.sleep(25_000);
    }
  });
});
