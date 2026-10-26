import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Ejecutor } from "./transaccion.js";
import type { CambioParaApartar } from "../contratos/apartados.js";

// Lo apartado: el acceso a los datos (ADR-018).

// La sesión de un token, aunque esté cerrada, y si su usuario sigue activo. Sirve hasta 30 días
// después de cerrada (o de vencida): después, lo que haya quedado en el dispositivo ya no sube.
export const sesionDelToken = (e: Ejecutor, tokenHash: string) =>
  sql<{ id: string; usuario_id: string; activo: boolean }>`SELECT s.id, s.usuario_id, u.activo FROM usuario u JOIN sesion s ON s.usuario_id = u.id WHERE s.token_hash = ${tokenHash} AND COALESCE(s.revocada_en, s.expira_en) > now() - interval '30 days'`
    .execute(e).then((r) => r.rows[0] ?? null);

// Guarda cada cambio una sola vez: si ya llegó (misma sesión y mismo orden), no hace nada.
export async function apartar(e: Ejecutor, sesion: { id: string; usuario_id: string }, cambios: CambioParaApartar[]): Promise<void> {
  for (const c of cambios) {
    const hecho = Number.isNaN(Date.parse(c.creado_en)) ? new Date() : new Date(c.creado_en);
    await e.insertInto("cambio_apartado").values({
      id: randomUUID(), usuario_id: sesion.usuario_id, sesion_id: sesion.id, orden: c.orden, tipo: c.tipo, metodo: c.metodo, ruta: c.ruta,
      cuerpo: c.cuerpo === undefined ? null : JSON.stringify(c.cuerpo), hecho_en: hecho,
    }).onConflict((oc) => oc.columns(["sesion_id", "orden"]).doNothing()).execute();
  }
}

// Lo que espera una decisión, de lo más viejo a lo más nuevo, con quién lo hizo, cuándo se
// cerró su sesión, el dispositivo y el producto al que apunta la ruta, si apunta a uno (su
// identificador: los productos son de Comercial).
export const pendientes = (e: Ejecutor) =>
  e.selectFrom("cambio_apartado as a").innerJoin("usuario as u", "u.id", "a.usuario_id").innerJoin("sesion as s", "s.id", "a.sesion_id")
    .select(["a.id", "a.tipo", "a.metodo", "a.ruta", "a.cuerpo", "a.hecho_en", "a.llegado_en", "a.error", "a.usuario_id", sql<string>`COALESCE(u.nombre, u.email)`.as("usuario"),
      "s.revocada_en as desactivado_en", "s.dispositivo",
      // El producto de la ruta: /productos/:id, /stock/:id/ajustes o /conteos/:conteo/renglones/:id.
      sql<string | null>`COALESCE(substring(a.ruta from '^/(?:productos|stock)/([0-9a-fA-F-]{36})'), substring(a.ruta from '/renglones/([0-9a-fA-F-]{36})$'))`.as("producto_id")])
    .where("a.decision", "is", null).orderBy("a.hecho_en").orderBy("a.orden").execute();

// Uno, bloqueado hasta que termine la transacción: así se decide una sola vez.
export const paraDecidir = (e: Ejecutor, id: string) =>
  e.selectFrom("cambio_apartado as a").leftJoin("usuario as d", "d.id", "a.decidido_por")
    .select(["a.id", "a.usuario_id", "a.sesion_id", "a.tipo", "a.metodo", "a.ruta", "a.cuerpo", "a.decision", sql<string | null>`COALESCE(d.nombre, d.email)`.as("decidido_por")])
    .where("a.id", "=", id).forUpdate("a").executeTakeFirst();

export const decidir = (e: Ejecutor, id: string, decision: "aceptado" | "descartado", quien: string) =>
  e.updateTable("cambio_apartado").set({ decision, decidido_por: quien, decidido_en: new Date(), error: null }).where("id", "=", id).execute();

export const anotarError = (e: Ejecutor, id: string, error: string) =>
  e.updateTable("cambio_apartado").set({ error }).where("id", "=", id).execute();
