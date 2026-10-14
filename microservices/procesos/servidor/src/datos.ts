import type pg from "pg";
import type { Almacen, FilaDeVersion, NuevaVersion, ProcesoGuardado } from "./almacen.js";

// Los datos de Procesos en Postgres, en el esquema «procesos». Cada valor va como parámetro.
// Los cambios que dependen de la revisión la suben en el mismo UPDATE que la comprueba: si
// otro guardó antes, no cambia ninguna fila y se devuelve null (E41).

type Fila = {
  id: string; nombre: string; revision: number; actualizado_en: Date;
  v_id: string | null; v_estado: FilaDeVersion["estado"] | null; v_bpmn: string | null; v_pasos: number | null;
  v_hecha_por: string | null; v_creada_en: Date | null; v_actualizada_en: Date | null;
};

const SELECCION = `
  SELECT p.id, p.nombre, p.revision, p.actualizado_en,
         v.id AS v_id, v.estado AS v_estado, v.bpmn AS v_bpmn, v.pasos AS v_pasos,
         v.hecha_por AS v_hecha_por, v.creada_en AS v_creada_en, v.actualizada_en AS v_actualizada_en
    FROM procesos.proceso p
    LEFT JOIN procesos.version v ON v.proceso_id = p.id AND v.estado IN ('borrador', 'vigente')`;

function agrupar(filas: Fila[]): ProcesoGuardado[] {
  const por = new Map<string, ProcesoGuardado>();
  for (const f of filas) {
    const p = por.get(f.id) ?? { id: f.id, nombre: f.nombre, revision: f.revision, actualizado: f.actualizado_en, vigente: null, borrador: null };
    por.set(f.id, p);
    if (f.v_id && f.v_estado && f.v_estado !== "anterior") {
      p[f.v_estado] = {
        id: f.v_id, estado: f.v_estado, bpmn: f.v_bpmn!, pasos: f.v_pasos!, hechaPor: f.v_hecha_por!, creada: f.v_creada_en!, actualizada: f.v_actualizada_en!,
      };
    }
  }
  return [...por.values()];
}

export function almacenEnPostgres(pool: pg.Pool): Almacen {
  async function enTransaccion<T>(hacer: (c: pg.PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const r = await hacer(c);
      await c.query("COMMIT");
      return r;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  // Sube la revisión si sigue siendo la esperada; null si otro cambió antes.
  async function subir(c: pg.PoolClient, id: string, revision: number): Promise<number | null> {
    const { rows } = await c.query<{ revision: number }>(
      "UPDATE procesos.proceso SET revision = revision + 1, actualizado_en = now() WHERE id = $1 AND revision = $2 RETURNING revision",
      [id, revision],
    );
    return rows[0]?.revision ?? null;
  }
  const insertarVersion = (c: pg.PoolClient, id: string, estado: string, v: NuevaVersion) =>
    c.query("INSERT INTO procesos.version (proceso_id, estado, bpmn, pasos, hecha_por_id, hecha_por) VALUES ($1, $2, $3, $4, $5, $6)", [id, estado, v.bpmn, v.pasos, v.autor.id, v.autor.nombre]);

  return {
    async listar() {
      return agrupar((await pool.query<Fila>(SELECCION)).rows);
    },
    async leer(id) {
      return agrupar((await pool.query<Fila>(`${SELECCION} WHERE p.id = $1`, [id])).rows)[0] ?? null;
    },
    async conNombre(nombre) {
      const { rows } = await pool.query<{ id: string }>("SELECT id FROM procesos.proceso WHERE lower(nombre) = lower($1)", [nombre]);
      return rows[0]?.id ?? null;
    },
    async crear(nombre, borrador) {
      return enTransaccion(async (c) => {
        const { rows } = await c.query<{ id: string }>("INSERT INTO procesos.proceso (nombre) VALUES ($1) RETURNING id", [nombre]);
        const id = rows[0]!.id;
        await insertarVersion(c, id, "borrador", borrador);
        return id;
      });
    },
    async renombrar(id, nombre) {
      const { rowCount } = await pool.query("UPDATE procesos.proceso SET nombre = $2, actualizado_en = now() WHERE id = $1", [id, nombre]);
      return (rowCount ?? 0) > 0;
    },
    async borrar(id) {
      const { rowCount } = await pool.query("DELETE FROM procesos.proceso WHERE id = $1", [id]);
      return (rowCount ?? 0) > 0;
    },
    async guardarBorrador(id, revision, v) {
      return enTransaccion(async (c) => {
        const nueva = await subir(c, id, revision);
        if (nueva === null) return null;
        const { rowCount } = await c.query(
          "UPDATE procesos.version SET bpmn = $2, pasos = $3, hecha_por_id = $4, hecha_por = $5, actualizada_en = now() WHERE proceso_id = $1 AND estado = 'borrador'",
          [id, v.bpmn, v.pasos, v.autor.id, v.autor.nombre],
        );
        if (!rowCount) await insertarVersion(c, id, "borrador", v);
        return nueva;
      });
    },
    async descartarBorrador(id, revision) {
      return enTransaccion(async (c) => {
        const nueva = await subir(c, id, revision);
        if (nueva !== null) await c.query("DELETE FROM procesos.version WHERE proceso_id = $1 AND estado = 'borrador'", [id]);
        return nueva;
      });
    },
    async marcarVigente(id, revision) {
      return enTransaccion(async (c) => {
        const nueva = await subir(c, id, revision);
        if (nueva === null) return null;
        await c.query("UPDATE procesos.version SET estado = 'anterior' WHERE proceso_id = $1 AND estado = 'vigente'", [id]);
        await c.query("UPDATE procesos.version SET estado = 'vigente', actualizada_en = now() WHERE proceso_id = $1 AND estado = 'borrador'", [id]);
        return nueva;
      });
    },
    async historial(id) {
      const { rows } = await pool.query<{ id: string; estado: FilaDeVersion["estado"]; bpmn: string; pasos: number; hecha_por: string; creada_en: Date; actualizada_en: Date }>(
        "SELECT id, estado, bpmn, pasos, hecha_por, creada_en, actualizada_en FROM procesos.version WHERE proceso_id = $1 AND estado <> 'borrador' ORDER BY actualizada_en DESC",
        [id],
      );
      return rows.map((r) => ({ id: r.id, estado: r.estado, bpmn: r.bpmn, pasos: r.pasos, hechaPor: r.hecha_por, creada: r.creada_en, actualizada: r.actualizada_en }));
    },
  };
}
