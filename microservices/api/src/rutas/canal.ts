import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { CABECERA_DE_TEMAS, MAXIMO_POR_TANDA } from "conexion-entre-dispositivos/servidor";
import { exigirSesion, limitarIntentos, sesionSiHay } from "../autenticacion.js";
import * as reglas from "../avisos/reglas.js";

// El canal de cada dispositivo (ADR-030): lo que espera, en tiempo real, mientras lo espera. La
// ruta solo traduce (ADR-018); quién puede escuchar qué está en `avisos/reglas.ts`.
export const canal = new Hono();

// Abrir el canal con los temas de la cabecera. Sirve con sesión o sin ella (la entrada con código QR).
// Hasta 120 aperturas por minuto desde la misma dirección: un dispositivo abre una por pantalla.
canal.get("/", limitarIntentos(120, "canal"), sesionSiHay, (c) => reglas.abrirCanal(c.req.header(CABECERA_DE_TEMAS), c.req.header("X-Canal"), c.get("sesion")));

// Mandar por el vínculo. El cuerpo se corta antes de leerlo entero: hasta 1 MB por tanda (023-E27).
canal.post("/:tema", exigirSesion, bodyLimit({ maxSize: MAXIMO_POR_TANDA * 4, onError: (c) => c.body(null, 413) }), async (c) => {
  const estado = await reglas.mandarPorElVinculo(c.req.param("tema"), c.get("sesion"), await c.req.text());
  return estado === 404 ? c.json({ error: "Este dispositivo no está emparejado" }, 404) : c.body(null, estado);
});
