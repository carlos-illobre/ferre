import { Hono } from "hono";
import { cors } from "hono/cors";
import { VERSION_CALCULO_DE_PRECIOS } from "@ferre/calculo-de-precios";
import { config } from "./config.js";
import { baseResponde } from "./db.js";

export const app = new Hono();

// El cliente web vive en otro origen (ADR-010): solo ese origen puede llamar desde el navegador.
app.use("/*", cors({ origin: config.origenWeb, credentials: false }));

app.get("/health", async (c) => {
  const db = await baseResponde();
  return c.json(
    { ok: db, db: db ? "ok" : "sin-respuesta", calculoDePrecios: VERSION_CALCULO_DE_PRECIOS },
    db ? 200 : 503,
  );
});
