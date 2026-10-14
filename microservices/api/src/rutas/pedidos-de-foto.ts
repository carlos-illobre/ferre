import { Hono } from "hono";
import { exigirSesion } from "../autenticacion.js";
import { computadorasDelCelular } from "../acceso/reglas.js";
import * as fotos from "../acceso/fotos.js";
import type { FotoRecibida } from "../contratos/pedidos-de-foto.js";
import { pedidoDeFotoNuevo } from "../acceso/esquemas.js";
import { leerCuerpo } from "../validar.js";

// Pedido de foto (la computadora le pide una foto al celular). La ruta solo traduce (ADR-018);
// las reglas están en `acceso/fotos.ts`.
export const pedidosDeFoto = new Hono();
pedidosDeFoto.use("/*", exigirSesion);

export const fotosQueEsperan = fotos.queEsperan;

pedidosDeFoto.post("/", async (c) => {
  const cuerpo = await leerCuerpo(c, pedidoDeFotoNuevo);
  if (!cuerpo.ok) return c.json({ error: cuerpo.error }, 400);
  return c.json(fotos.pedir(cuerpo.datos.para, c.get("sesion").id), 201);
});

// El celular emparejado (decisión 58) pregunta si su computadora está esperando alguna foto:
// así no hace falta leer el código. Va antes de «/:codigo» para que no la tape.
pedidosDeFoto.get("/para-mi", async (c) => c.json(fotos.queEsperan(await computadorasDelCelular(c.get("sesion").id))));

// La computadora pregunta si ya llegó; el celular, si el código vale y para qué es la foto.
pedidosDeFoto.get("/:codigo", (c) => {
  const e = fotos.estado(c.req.param("codigo"));
  return e ? c.json(e) : c.json({ error: fotos.VENCIDO }, 404);
});

pedidosDeFoto.post("/:codigo/foto", async (c) => {
  const rechazo = await fotos.recibir(c.req.param("codigo"), (await c.req.parseBody()).foto);
  return rechazo ? c.json({ error: rechazo.error }, rechazo.estado) : c.json({ ok: true } satisfies FotoRecibida, 201);
});

pedidosDeFoto.get("/:codigo/foto", (c) => {
  const r = fotos.retirar(c.req.param("codigo"));
  if ("error" in r) return c.json(r, 404);
  return c.body(r.contenido, 200, { "Content-Type": r.tipo, "Cache-Control": "no-store" });
});
