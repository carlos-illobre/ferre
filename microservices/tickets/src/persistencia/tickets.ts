import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EventoDeAuditoria } from "auditoria-kit";
import { sql, type Kysely } from "kysely";
import type { Base } from "./conexion.js";
import type { DB } from "./tablas.js";

// Los tickets en su base (esquema «tickets») y sus fotos en una carpeta propia (specs/028). Cada
// cambio y su evento de auditoría van en la misma transacción; un cambio que no pasó no anota.

/** Cómo se anota un evento de auditoría en la transacción: la bandeja del kit (specs/027). */
export type Anotador = (trx: Kysely<DB>, evento: EventoDeAuditoria) => Promise<void>;
export type Persona = { id: string; nombre: string };
export type TicketNuevo = { id: string; tipo: "error" | "mejora"; descripcion: string; dispositivo: string | null; version: string | null; fotos: { contenido: Buffer; extension: string }[] };

export function datosDeTickets(base: Base, carpeta: string, auditoria: Anotador) {
  return {
    ultimos: () => sql<{
      id: string; tipo: "error" | "mejora"; descripcion: string; dispositivo: string | null; version: string | null; creado_en: Date;
      estado: "abierto" | "resuelto"; resuelto_en: Date | null; nota: string | null; usuario: string; resuelto_por: string | null; fotos: string[];
    }>`SELECT t.id, t.tipo, t.descripcion, t.dispositivo, t.version, t.creado_en, t.estado, t.resuelto_en, t.nota,
              t.usuario_nombre AS usuario, t.resuelto_por_nombre AS resuelto_por,
              COALESCE((SELECT json_agg('/tickets/fotos/' || f.archivo ORDER BY f.orden) FROM tickets.ticket_foto f WHERE f.ticket_id = t.id), '[]'::json) AS fotos
         FROM tickets.ticket t ORDER BY t.creado_en DESC LIMIT 200`.execute(base).then((r) => r.rows),

    /** Guarda el ticket y sus fotos si no estaba (el id lo pone el dispositivo); dice si es nuevo. */
    crear: (t: TicketNuevo, quien: Persona, evento: EventoDeAuditoria) => base.transaction().execute(async (trx) => {
      const { rows } = await sql`INSERT INTO tickets.ticket (id, tipo, descripcion, dispositivo, version, usuario_id, usuario_nombre)
        VALUES (${t.id}, ${t.tipo}::tickets.tipo_de_ticket, ${t.descripcion}, ${t.dispositivo}, ${t.version}, ${quien.id}, ${quien.nombre})
        ON CONFLICT (id) DO NOTHING RETURNING id`.execute(trx);
      if (rows.length === 0) return false;
      await mkdir(carpeta, { recursive: true });
      for (const [orden, f] of t.fotos.entries()) {
        const archivo = `${randomUUID()}${f.extension}`;
        await writeFile(path.join(carpeta, archivo), f.contenido);
        await sql`INSERT INTO tickets.ticket_foto (ticket_id, orden, archivo) VALUES (${t.id}, ${orden}, ${archivo})`.execute(trx);
      }
      await auditoria(trx, evento);
      return true;
    }),

    resolver: (id: string, quien: Persona, nota: string | null, evento: EventoDeAuditoria) => base.transaction().execute(async (trx) => {
      const { rows } = await sql`UPDATE tickets.ticket SET estado = 'resuelto', resuelto_en = now(), resuelto_por_id = ${quien.id}, resuelto_por_nombre = ${quien.nombre}, nota = ${nota}
        WHERE id = ${id} AND estado = 'abierto' RETURNING id`.execute(trx);
      if (rows.length === 0) return false;
      await auditoria(trx, evento);
      return true;
    }),

    // Al reabrir se borra también la nota de la resolución (RF-81).
    reabrir: (id: string, evento: EventoDeAuditoria) => base.transaction().execute(async (trx) => {
      const { rows } = await sql`UPDATE tickets.ticket SET estado = 'abierto', resuelto_en = NULL, resuelto_por_id = NULL, resuelto_por_nombre = NULL, nota = NULL
        WHERE id = ${id} AND estado = 'resuelto' RETURNING id`.execute(trx);
      if (rows.length === 0) return false;
      await auditoria(trx, evento);
      return true;
    }),

    /** El contenido de una foto, o null si no existe. El nombre ya viene validado por las reglas. */
    leerFoto: (nombre: string) => readFile(path.join(carpeta, nombre)).catch(() => null),
  };
}
export type DatosDeTickets = ReturnType<typeof datosDeTickets>;
