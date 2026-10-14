import { sql, type ExpressionBuilder } from "kysely";
import type { Ejecutor } from "../base.js";
import type { Base } from "../tablas.js";

// Quién hizo qué: la tabla de eventos (ADR-003), filtrable por usuario, tipo y fechas.
export type Filtros = { usuario: string | null; tipo: string | null; desde: string | null; hasta: string | null };

const filtrar = (f: Filtros) => (eb: ExpressionBuilder<Base & { e: Base["evento"] }, "e">) => eb.and([
  ...(f.usuario ? [eb("e.usuario_id", "=", f.usuario)] : []),
  ...(f.tipo ? [eb("e.tipo", "like", `${f.tipo}%`)] : []),
  ...(f.desde ? [eb("e.fecha", ">=", new Date(f.desde))] : []),
  ...(f.hasta ? [eb("e.fecha", "<", new Date(f.hasta))] : []),
]);

export const pagina = (e: Ejecutor, f: Filtros, cuantos: number, desde: number) =>
  e.selectFrom("evento as e").leftJoin("usuario as u", "u.id", "e.usuario_id")
    .select(["e.id", "e.tipo", "e.fecha", "e.dispositivo_id", "e.contenido", "u.email", "u.nombre"])
    .where(filtrar(f)).orderBy("e.fecha", "desc").limit(cuantos).offset(desde).execute();

export async function cuantos(e: Ejecutor, f: Filtros): Promise<number> {
  const fila = await e.selectFrom("evento as e").select(sql<string>`count(*)`.as("total")).where(filtrar(f)).executeTakeFirst();
  return Number(fila?.total ?? 0);
}
