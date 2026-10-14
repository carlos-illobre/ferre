import { pool } from "../db.js";
import { Deshacer, enTransaccionPg } from "../base.js";
import { registrarEvento } from "../eventos.js";
import type { Sugerencia, Union } from "../contratos/equivalencias.js";
import type { Enviable } from "../enviable.js";
import { separarProductos, sugerirEquivalencias, unirProductos, type Movidos } from "./datos.js";

// Duplicados entre proveedores (issue #29), en sus reglas (ADR-018): quien tiene el permiso ve
// las sugerencias y las une o las rechaza; también une dos productos a mano y separa lo unido,
// a partir del registro de lo que se movió. `datos.ts` tiene el SQL.
const RESUMEN = `
  SELECT p.id, p.descripcion, p.marca, p.codigo_barras, pr.nombre AS proveedor, pp.costo_neto, pp.fecha_lista::text
    FROM producto p
    LEFT JOIN LATERAL (SELECT * FROM precio_proveedor x WHERE x.producto_id = p.id ORDER BY x.fecha_lista DESC, x.creado_en DESC LIMIT 1) pp ON true
    LEFT JOIN proveedor pr ON pr.id = pp.proveedor_id
   WHERE p.id = $1`;

export async function sugerencias(): Promise<Enviable<Sugerencia>[]> {
  const { rows } = await pool.query<{ id: string; producto_a: string; producto_b: string; motivo: string; creado_en: string }>(
    "SELECT id, producto_a, producto_b, motivo, creado_en FROM equivalencia_sugerida WHERE estado = 'pendiente' ORDER BY creado_en DESC LIMIT 100");
  const salida: Enviable<Sugerencia>[] = [];
  for (const r of rows) {
    const [a, b] = await Promise.all([pool.query(RESUMEN, [r.producto_a]), pool.query(RESUMEN, [r.producto_b])]);
    salida.push({ id: r.id, motivo: r.motivo, creado_en: r.creado_en, a: a.rows[0], b: b.rows[0] });
  }
  return salida;
}

// Volver a buscar duplicados en todo el catálogo (las listas ya lo hacen al aplicarse).
export const buscar = (): Promise<number> => sugerirEquivalencias(pool, null);

export type Resultado = { ok: true } | { ok: false; estado: 400 | 404 | 409; error: string };
const mal = (estado: 400 | 404 | 409, error: string): Resultado => ({ ok: false, estado, error });

// «Es el mismo» (conservando el lado elegido) o «son distintos».
export function resolver(id: string, accion: "unir" | "rechazar", lado: "a" | "b" | undefined, usuarioId: string): Promise<Resultado> {
  return enTransaccionPg(async (cliente) => {
    const { rows } = await cliente.query<{ producto_a: string; producto_b: string }>("SELECT producto_a, producto_b FROM equivalencia_sugerida WHERE id = $1 AND estado = 'pendiente' FOR UPDATE", [id]);
    if (!rows[0]) throw new Deshacer(mal(409, "La sugerencia no existe o ya se resolvió"));
    if (accion === "unir") {
      const conservar = lado === "b" ? rows[0].producto_b : rows[0].producto_a;
      const absorber = conservar === rows[0].producto_a ? rows[0].producto_b : rows[0].producto_a;
      const registro = await unirProductos(cliente, conservar, absorber);
      await cliente.query("UPDATE equivalencia_sugerida SET estado = 'unida', resuelto_en = now(), resuelto_por = $2 WHERE id = $1", [id, usuarioId]);
      await registrarEvento(cliente, { tipo: "producto.unido", usuarioId, contenido: { conservar, absorber, sugerencia: id, ...registro } });
    } else {
      await cliente.query("UPDATE equivalencia_sugerida SET estado = 'rechazada', resuelto_en = now(), resuelto_por = $2 WHERE id = $1", [id, usuarioId]);
      await registrarEvento(cliente, { tipo: "equivalencia.rechazada", usuarioId, contenido: { sugerencia: id } });
    }
    return { ok: true } as Resultado;
  });
}

// Unión manual de dos productos cualesquiera.
export function unirAMano(conservar: string | undefined, absorber: string | undefined, usuarioId: string): Promise<Resultado> {
  if (!conservar || !absorber || conservar === absorber) return Promise.resolve(mal(400, "Elegí dos productos distintos"));
  return enTransaccionPg(async (cliente) => {
    const { rowCount } = await cliente.query("SELECT 1 FROM producto WHERE id IN ($1, $2) AND activo", [conservar, absorber]);
    if (rowCount !== 2) throw new Deshacer(mal(404, "Alguno de los productos no existe o ya fue unido"));
    const registro = await unirProductos(cliente, conservar, absorber);
    await registrarEvento(cliente, { tipo: "producto.unido", usuarioId, contenido: { conservar, absorber, manual: true, ...registro } });
    return { ok: true } as Resultado;
  });
}

// Las uniones hechas, mientras el absorbido siga dentro del conservado: se pueden separar.
export const unidos = (): Promise<Enviable<Union>[]> => pool.query(
  `SELECT a.id AS absorbido_id, a.descripcion AS absorbido, c.id AS conservado_id, c.descripcion AS conservado, a.modificado_en AS unido_en,
          (SELECT string_agg(DISTINCT pr.nombre, ', ') FROM precio_proveedor pp JOIN proveedor pr ON pr.id = pp.proveedor_id WHERE pp.producto_id = c.id) AS proveedores
     FROM producto a JOIN producto c ON c.id = a.reemplazado_por
    WHERE a.reemplazado_por IS NOT NULL
    ORDER BY a.modificado_en DESC LIMIT 100`).then((r) => r.rows);

// Deshacer una unión a partir del registro de lo que se movió (evento producto.unido).
export function separar(absorbido: string | undefined, usuarioId: string): Promise<Resultado> {
  if (!absorbido) return Promise.resolve(mal(400, "Falta absorbido_id"));
  return enTransaccionPg(async (cliente) => {
    const { rows } = await cliente.query<{ reemplazado_por: string | null }>("SELECT reemplazado_por FROM producto WHERE id = $1 FOR UPDATE", [absorbido]);
    const conservar = rows[0]?.reemplazado_por;
    if (!conservar) throw new Deshacer(mal(409, "Ese producto no está unido a otro"));
    const evento = await cliente.query<{ contenido: Movidos & { conservar: string } }>(
      "SELECT contenido FROM evento WHERE tipo = 'producto.unido' AND contenido->>'absorber' = $1 ORDER BY fecha DESC LIMIT 1", [absorbido]);
    const registro = evento.rows[0]?.contenido;
    if (!registro || registro.conservar !== conservar || !registro.movidos) throw new Deshacer(mal(409, "No hay registro de esa unión: no se puede separar sola"));
    await separarProductos(cliente, conservar, absorbido, registro);
    await registrarEvento(cliente, { tipo: "producto.separado", usuarioId, contenido: { conservar, absorbido } });
    return { ok: true } as Resultado;
  });
}
