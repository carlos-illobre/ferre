import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import * as reglas from "../listas/reglas.js";

// Listas de precios (issues #7 a #12). La ruta solo traduce (ADR-018); las reglas, los datos y
// el lector de planillas están en `listas/`.
export const listas = new Hono();
listas.use("/*", exigirSesion);

listas.get("/", exigirPermiso("catalogo.listas"), async (c) => c.json(await reglas.historial()));

// multipart: archivo, proveedor_id (opcional: si falta, se detecta), fecha_lista (opcional)
listas.post("/", exigirPermiso("catalogo.listas"), async (c) => {
  const cuerpo = await c.req.parseBody();
  const r = await reglas.cargar(cuerpo["archivo"], cuerpo["proveedor_id"], cuerpo["fecha_lista"], c.get("sesion").usuario.id);
  return "estado" in r && "error" in r ? c.json({ error: r.error }, r.estado as 400) : c.json(r, 201);
});

listas.get("/lectores", exigirPermiso("catalogo.listas"), async (c) => {
  const lectores = await reglas.lectores();
  return lectores ? c.json(lectores) : c.json({ error: "El servicio de listas no responde" }, 502);
});

listas.get("/:id/filas", exigirPermiso("catalogo.listas"), async (c) => {
  const r = await reglas.filas(c.req.param("id"), Number(c.req.query("desde") ?? 0));
  return r ? c.json(r) : c.json({ error: "No existe esa lista" }, 404);
});

listas.post("/:id/aplicar", exigirPermiso("catalogo.listas"), async (c) => {
  const r = await reglas.aplicar(c.req.param("id"), c.get("sesion").usuario.id);
  return "error" in r ? c.json({ error: r.error }, r.estado as 404) : c.json(r, 202);
});

// El Excel original trae todos los costos del proveedor: lo baja quien ve costos o carga listas (decisión 53).
listas.get("/:id/archivo", exigirPermiso("catalogo.costos", "catalogo.listas"), async (c) => {
  const r = await reglas.archivo(c.req.param("id"));
  if ("error" in r) return c.json(r, 404);
  return c.body(new Uint8Array(r.contenido), 200, {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${r.nombre}"; filename*=UTF-8''${encodeURIComponent(r.original)}`,
  });
});

// La ficha del producto muestra de qué lista sale su costo: lo ve quien ve costos (specs/016).
listas.get("/:id/origen", exigirPermiso("catalogo.costos"), async (c) => {
  const r = await reglas.origen(c.req.param("id"));
  return r ? c.json(r) : c.json({ error: "No existe esa lista" }, 404);
});

listas.get("/:id", exigirPermiso("catalogo.listas"), async (c) => {
  const r = await reglas.estado(c.req.param("id"));
  return r ? c.json(r) : c.json({ error: "No existe esa lista" }, 404);
});

listas.post("/:id/descartar", exigirPermiso("catalogo.listas"), async (c) => {
  return (await reglas.descartar(c.req.param("id"), c.get("sesion").usuario.id)) ? c.body(null, 204) : c.json({ error: "La lista no existe o ya no está pendiente" }, 409);
});
