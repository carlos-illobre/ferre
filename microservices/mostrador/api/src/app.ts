import { Hono } from "hono";
import { serveStatic } from "@hono/node-server/serve-static";
import { VERSION_PRECIOS } from "@ferre/precios";
import { baseResponde } from "./db.js";

export const app = new Hono();

app.get("/health", async (c) => {
  const db = await baseResponde();
  return c.json({ ok: db, db: db ? "ok" : "sin-respuesta", precios: VERSION_PRECIOS }, db ? 200 : 503);
});

// La PWA compilada se sirve desde el mismo contenedor: un solo proceso, una sola imagen.
app.use("/*", serveStatic({ root: "./public" }));
app.get("/*", serveStatic({ root: "./public", path: "index.html" }));
