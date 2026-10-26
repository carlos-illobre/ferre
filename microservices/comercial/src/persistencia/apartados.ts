import { sql } from "kysely";
import type { Ejecutor } from "./transaccion.js";

// Lo apartado que Acceso repite acá (specs/014, 029): de unos productos, los que ya no están
// (unidos con otro, con cuál, o dados de baja).
export const productosQueYaNoEstan = (e: Ejecutor, ids: string[]) =>
  sql<{ descripcion: string; reemplazo: string | null }>`SELECT p.descripcion, r.descripcion AS reemplazo FROM producto p LEFT JOIN producto r ON r.id = p.reemplazado_por WHERE p.id::text = ANY(${ids}) AND NOT p.activo`
    .execute(e).then((r) => r.rows);
