import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Ejecutor } from "../base.js";

// Clientes: el acceso a los datos (ADR-018). La deuda es lo vendido a cuenta corriente,
// confirmado y sin pagar, más las diferencias de los cambios de esas ventas que quedaron en la
// cuenta (019, ADR-024: un movimiento de dinero en cuenta corriente).
export const activosConDeuda = (e: Ejecutor) =>
  e.selectFrom("cliente as cl").leftJoin("venta as v", "v.cliente_id", "cl.id")
    .select(["cl.id", "cl.nombre", "cl.telefono", "cl.cuenta_corriente",
      sql<string>`COALESCE(SUM(v.total) FILTER (WHERE v.medio_pago = 'cuenta_corriente' AND v.estado = 'confirmada' AND v.pagada_en IS NULL), 0)
        + COALESCE((SELECT SUM(m.importe) FROM movimiento_dinero m JOIN venta mv ON mv.id = m.venta_id
                    WHERE m.cliente_id = cl.id AND m.medio_pago = 'cuenta_corriente' AND mv.estado = 'confirmada' AND mv.pagada_en IS NULL), 0)`.as("deuda")])
    .where("cl.activo", "=", true).groupBy("cl.id").orderBy("cl.nombre").execute();

export async function insertar(e: Ejecutor, c: { nombre: string; telefono: string | null; cuenta_corriente: boolean }): Promise<string> {
  const id = randomUUID();
  await e.insertInto("cliente").values({ id, ...c }).execute();
  return id;
}
