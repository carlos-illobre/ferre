import { Hono } from "hono";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import { base } from "../base.js";
import * as datos from "../anomalias/datos.js";

// Anomalías (RF-59): el registro de cada vez que el sistema y la realidad no coincidieron.
// Se anotan solas (hoy, al vender algo que según el sistema no tenía stock) y no se editan
// ni se borran: son una auditoría. No hay reglas: la ruta pagina y lee (ADR-018).
export const anomalias = new Hono();
anomalias.use("/*", exigirSesion, exigirPermiso("negocio.anomalias"));

const POR_PAGINA = 50;
anomalias.get("/", async (c) => {
  const pagina = Math.max(1, Math.floor(Number(c.req.query("pagina") ?? 1)) || 1);
  // Se pide una de más para saber si hay otra página.
  const filas = await datos.pagina(base, POR_PAGINA + 1, (pagina - 1) * POR_PAGINA);
  return c.json({ pagina, hay_mas: filas.length > POR_PAGINA, anomalias: filas.slice(0, POR_PAGINA) });
});
