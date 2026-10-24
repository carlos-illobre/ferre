import { sql, type Transaction } from "kysely";
import type { Almacen, FilaDeVersion, NuevaVersion, ProcesoGuardado } from "../almacen.js";
import type { Base } from "./conexion.js";
import type { DB } from "./tablas.js";

// Los datos de Procesos en Postgres, en el esquema «procesos». Cada valor va como parámetro.
// Los cambios que dependen de la revisión la suben en el mismo UPDATE que la comprueba: si
// otro guardó antes, no cambia ninguna fila y se devuelve null (E41).

type Fila = {
  id: string; nombre: string; revision: number; actualizado_en: Date;
  v_id: string | null; v_estado: "borrador" | "vigente" | null; v_bpmn: string | null; v_pasos: number | null;
  v_hecha_por: string | null; v_creada_en: Date | null; v_actualizada_en: Date | null;
};

const SELECCION = sql.raw(`
  SELECT p.id, p.nombre, p.revision, p.actualizado_en,
         v.id AS v_id, v.estado AS v_estado, v.bpmn AS v_bpmn, v.pasos AS v_pasos,
         v.hecha_por AS v_hecha_por, v.creada_en AS v_creada_en, v.actualizada_en AS v_actualizada_en
    FROM procesos.proceso p
    LEFT JOIN procesos.version v ON v.proceso_id = p.id AND v.estado IN ('borrador', 'vigente')`);

// Una fila por proceso, con su vigente y su borrador si los tiene.
function agrupar(filas: Fila[]): ProcesoGuardado[] {
  const por = new Map<string, ProcesoGuardado>();
  for (const f of filas) {
    const p = por.get(f.id) ?? { id: f.id, nombre: f.nombre, revision: f.revision, actualizado: f.actualizado_en, vigente: null, borrador: null };
    por.set(f.id, p);
    if (f.v_estado) {
      p[f.v_estado] = { id: f.v_id!, estado: f.v_estado, bpmn: f.v_bpmn!, pasos: f.v_pasos!, hechaPor: f.v_hecha_por!, creada: f.v_creada_en!, actualizada: f.v_actualizada_en! };
    }
  }
  return [...por.values()];
}

type Trx = Transaction<DB>;
const cambio = (r: { numAffectedRows?: bigint }) => Number(r.numAffectedRows) > 0;

// Sube la revisión si sigue siendo la esperada; null si otro cambió antes.
const subir = (trx: Trx, id: string, revision: number) =>
  sql<{ revision: number }>`UPDATE procesos.proceso SET revision = revision + 1, actualizado_en = now() WHERE id = ${id} AND revision = ${revision} RETURNING revision`
    .execute(trx).then((r) => r.rows[0]?.revision ?? null);

const insertarVersion = (trx: Trx, id: string, estado: string, v: NuevaVersion) =>
  sql`INSERT INTO procesos.version (proceso_id, estado, bpmn, pasos, hecha_por_id, hecha_por) VALUES (${id}, ${estado}, ${v.bpmn}, ${v.pasos}, ${v.autor.id}, ${v.autor.nombre})`.execute(trx);

export function almacenEnPostgres(base: Base): Almacen {
  // Si la revisión es la esperada, la sube y hace el cambio, todo junto; si no, null.
  const conRevision = (id: string, revision: number, hacer: (trx: Trx) => Promise<unknown>) =>
    base.transaction().execute(async (trx) => {
      const nueva = await subir(trx, id, revision);
      if (nueva !== null) await hacer(trx);
      return nueva;
    });

  return {
    listar: async () => agrupar((await sql<Fila>`${SELECCION}`.execute(base)).rows),
    leer: async (id) => agrupar((await sql<Fila>`${SELECCION} WHERE p.id = ${id}`.execute(base)).rows)[0] ?? null,
    conNombre: (nombre) => sql<{ id: string }>`SELECT id FROM procesos.proceso WHERE lower(nombre) = lower(${nombre})`.execute(base).then((r) => r.rows[0]?.id ?? null),
    crear: (nombre, borrador) => base.transaction().execute(async (trx) => {
      const { rows } = await sql<{ id: string }>`INSERT INTO procesos.proceso (nombre) VALUES (${nombre}) RETURNING id`.execute(trx);
      await insertarVersion(trx, rows[0]!.id, "borrador", borrador);
      return rows[0]!.id;
    }),
    renombrar: (id, nombre) => sql`UPDATE procesos.proceso SET nombre = ${nombre}, actualizado_en = now() WHERE id = ${id}`.execute(base).then(cambio),
    borrar: (id) => sql`DELETE FROM procesos.proceso WHERE id = ${id}`.execute(base).then(cambio),
    guardarBorrador: (id, revision, v) => conRevision(id, revision, async (trx) => {
      const r = await sql`UPDATE procesos.version SET bpmn = ${v.bpmn}, pasos = ${v.pasos}, hecha_por_id = ${v.autor.id}, hecha_por = ${v.autor.nombre}, actualizada_en = now() WHERE proceso_id = ${id} AND estado = 'borrador'`.execute(trx);
      if (!cambio(r)) await insertarVersion(trx, id, "borrador", v);
    }),
    descartarBorrador: (id, revision) => conRevision(id, revision, (trx) => sql`DELETE FROM procesos.version WHERE proceso_id = ${id} AND estado = 'borrador'`.execute(trx)),
    marcarVigente: (id, revision) => conRevision(id, revision, async (trx) => {
      await sql`UPDATE procesos.version SET estado = 'anterior' WHERE proceso_id = ${id} AND estado = 'vigente'`.execute(trx);
      await sql`UPDATE procesos.version SET estado = 'vigente', actualizada_en = now() WHERE proceso_id = ${id} AND estado = 'borrador'`.execute(trx);
    }),
    historial: async (id) => {
      const { rows } = await sql<{ id: string; estado: FilaDeVersion["estado"]; bpmn: string; pasos: number; hecha_por: string; creada_en: Date; actualizada_en: Date }>`
        SELECT id, estado, bpmn, pasos, hecha_por, creada_en, actualizada_en FROM procesos.version WHERE proceso_id = ${id} AND estado <> 'borrador' ORDER BY actualizada_en DESC`.execute(base);
      return rows.map((r) => ({ id: r.id, estado: r.estado, bpmn: r.bpmn, pasos: r.pasos, hechaPor: r.hecha_por, creada: r.creada_en, actualizada: r.actualizada_en }));
    },
  };
}
