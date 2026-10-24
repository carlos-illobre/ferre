import { sql } from "kysely";
import type { Ejecutor } from "./transaccion.js";

// Anomalías: el acceso a los datos (ADR-018). Las más nuevas primero.
export const pagina = (e: Ejecutor, cuantas: number, desde: number) =>
  e.selectFrom("anomalia as a").innerJoin("producto as p", "p.id", "a.producto_id").leftJoin("usuario as u", "u.id", "a.usuario_id")
    .select(["a.id", "a.tipo", "a.cantidad", "a.detalle", "a.creado_en", "a.venta_id", "a.producto_id", "p.descripcion as producto", "p.unidad", sql<string>`COALESCE(u.nombre, u.email)`.as("usuario")])
    .orderBy("a.creado_en", "desc").orderBy("a.id").limit(cuantas).offset(desde).execute();
