import { sql, type ExpressionBuilder } from "kysely";
import type { EventoMandado } from "auditoria-kit";
import type { Evento } from "../contratos/reportes.js";
import type { Base } from "./conexion.js";
import type { DB } from "./tablas.js";

// Los eventos de todos los servicios (specs/027): guardarlos sin duplicar y leerlos para los reportes.
// Viven en el esquema «auditoria» de su base.
const enAuditoria = (base: Base) => base.withSchema("auditoria");

// Guarda un lote, todo o nada; un id que ya estaba no se guarda dos veces. Devuelve cuántos
// quedaron guardados, contando los que ya estaban (contrato v1).
export async function guardar(base: Base, eventos: EventoMandado[]): Promise<number> {
  await enAuditoria(base).insertInto("evento").values(eventos.map((e) => ({
    id: e.id, servicio: e.servicio, tipo: e.tipo, fecha: new Date(e.fecha), quien_id: e.quien?.id ?? null, quien_nombre: e.quien?.nombre ?? null,
    dispositivo: e.dispositivo ?? null, titulo: e.titulo, detalle: e.detalle ?? null, grupo: e.grupo, importancia: e.importancia,
    referencias: JSON.stringify(e.referencias ?? []), contenido: JSON.stringify(e.contenido ?? {}),
  }))).onConflict((oc) => oc.column("id").doNothing()).execute();
  return eventos.length;
}

export type Filtros = { usuario: string | null; grupo: string | null; tipo: string | null; desde: string | null; hasta: string | null };

const filtrar = (f: Filtros) => (eb: ExpressionBuilder<DB, "evento">) => eb.and([
  ...(f.usuario ? [eb("quien_id", "=", f.usuario)] : []),
  ...(f.grupo ? [eb("grupo", "=", f.grupo)] : []),
  ...(f.tipo ? [eb("tipo", "like", `${f.tipo.replace(/[\\%_]/g, "\\$&")}%`)] : []),
  ...(f.desde ? [eb("fecha", ">=", new Date(f.desde))] : []),
  ...(f.hasta ? [eb("fecha", "<", new Date(f.hasta))] : []),
]);

// Una página, de la más nueva a la más vieja.
export async function pagina(base: Base, f: Filtros, cuantos: number, desde: number): Promise<Evento[]> {
  const filas = await enAuditoria(base).selectFrom("evento").selectAll().where(filtrar(f))
    .orderBy("fecha", "desc").orderBy("id", "desc").limit(cuantos).offset(desde).execute();
  return filas.map((r) => ({
    id: r.id, servicio: r.servicio, tipo: r.tipo, fecha: r.fecha.toISOString(), dispositivo: r.dispositivo,
    quien: r.quien_id ? { id: r.quien_id, nombre: r.quien_nombre! } : null,
    titulo: r.titulo, detalle: r.detalle, grupo: r.grupo, importancia: r.importancia as Evento["importancia"],
    referencias: r.referencias as Evento["referencias"], contenido: r.contenido as Evento["contenido"],
  }));
}

export async function cuantos(base: Base, f: Filtros): Promise<number> {
  const { n } = await enAuditoria(base).selectFrom("evento").select(sql<string>`count(*)`.as("n")).where(filtrar(f)).executeTakeFirstOrThrow();
  return Number(n);
}

// Los grupos que hay, en orden, para el filtro «qué».
export const grupos = (base: Base): Promise<string[]> =>
  enAuditoria(base).selectFrom("evento").select("grupo").distinct().orderBy("grupo").execute().then((r) => r.map((g) => g.grupo));
