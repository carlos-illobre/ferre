import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { sql } from "kysely";
import type { Ejecutor } from "../base.js";
import { config } from "../config.js";

// Tickets: el acceso a los datos (ADR-018). Las fotos son archivos en una carpeta propia.
export const carpetaTickets = () => path.join(config.carpetaListas, "tickets");

export const ultimos = (e: Ejecutor) =>
  e.selectFrom("ticket as t").innerJoin("usuario as u", "u.id", "t.usuario_id").leftJoin("usuario as r", "r.id", "t.resuelto_por")
    .select(["t.id", "t.tipo", "t.descripcion", "t.dispositivo", "t.version", "t.creado_en", "t.estado", "t.resuelto_en", "t.nota", "u.nombre as usuario", "r.nombre as resuelto_por",
      sql<string[]>`COALESCE((SELECT json_agg('/tickets/fotos/' || f.archivo ORDER BY f.orden) FROM ticket_foto f WHERE f.ticket_id = t.id), '[]'::json)`.as("fotos")])
    .orderBy("t.creado_en", "desc").limit(200).execute();

// Guarda el ticket si no estaba (el id lo pone el dispositivo); dice si es nuevo.
export async function insertar(e: Ejecutor, t: { id: string; tipo: "error" | "mejora"; descripcion: string; dispositivo: string | null; version: string | null; usuario_id: string }): Promise<boolean> {
  const r = await e.insertInto("ticket").values(t).onConflict((oc) => oc.column("id").doNothing()).executeTakeFirst();
  return Number(r.numInsertedOrUpdatedRows ?? 0n) > 0;
}

export async function guardarFoto(e: Ejecutor, ticketId: string, orden: number, contenido: Buffer, extension: string): Promise<void> {
  await mkdir(carpetaTickets(), { recursive: true });
  const archivo = `${randomUUID()}${extension}`;
  await writeFile(path.join(carpetaTickets(), archivo), contenido);
  await e.insertInto("ticket_foto").values({ ticket_id: ticketId, orden, archivo }).execute();
}

export const leerFoto = (nombre: string) => readFile(path.join(carpetaTickets(), nombre)).catch(() => null);

export async function resolver(e: Ejecutor, id: string, usuarioId: string, nota: string | null): Promise<boolean> {
  const r = await e.updateTable("ticket").set({ estado: sql`'resuelto'`, resuelto_en: sql`now()`, resuelto_por: usuarioId, nota }).where("id", "=", id).where("estado", "=", sql<"abierto">`'abierto'`).executeTakeFirst();
  return r.numUpdatedRows > 0n;
}

// Al reabrir se borra también la nota de la resolución (RF-81).
export async function reabrir(e: Ejecutor, id: string): Promise<boolean> {
  const r = await e.updateTable("ticket").set({ estado: sql`'abierto'`, resuelto_en: sql`NULL`, resuelto_por: sql`NULL`, nota: sql`NULL` }).where("id", "=", id).where("estado", "=", sql<"resuelto">`'resuelto'`).executeTakeFirst();
  return r.numUpdatedRows > 0n;
}
