import { Hono, type Context } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirAdministrador, exigirSesion } from "../autenticacion.js";
import { sugerirEquivalencias, unirProductos } from "../equivalencias.js";

// Duplicados entre proveedores (issue #29): el dueño ve las sugerencias, une o rechaza.
export const equivalencias = new Hono();
equivalencias.use("/*", exigirSesion, exigirAdministrador);

const RESUMEN = `
  SELECT p.id, p.descripcion, p.marca, p.codigo_barras, pr.nombre AS proveedor, pp.costo_neto, pp.fecha_lista::text
    FROM producto p
    LEFT JOIN LATERAL (SELECT * FROM precio_proveedor x WHERE x.producto_id = p.id ORDER BY x.fecha_lista DESC, x.creado_en DESC LIMIT 1) pp ON true
    LEFT JOIN proveedor pr ON pr.id = pp.proveedor_id
   WHERE p.id = $1`;

equivalencias.get("/", async (c) => {
  const { rows } = await pool.query<{ id: string; producto_a: string; producto_b: string; motivo: string; creado_en: string }>(
    "SELECT id, producto_a, producto_b, motivo, creado_en FROM equivalencia_sugerida WHERE estado = 'pendiente' ORDER BY creado_en DESC LIMIT 100",
  );
  const salida = [];
  for (const r of rows) {
    const [a, b] = await Promise.all([pool.query(RESUMEN, [r.producto_a]), pool.query(RESUMEN, [r.producto_b])]);
    salida.push({ id: r.id, motivo: r.motivo, creado_en: r.creado_en, a: a.rows[0], b: b.rows[0] });
  }
  return c.json(salida);
});

// Volver a buscar duplicados en todo el catálogo (las listas ya lo hacen al aplicarse).
equivalencias.post("/buscar", async (c) => {
  const nuevas = await sugerirEquivalencias(pool, null);
  return c.json({ nuevas });
});

async function resolver(c: Context, accion: "unir" | "rechazar") {
  const id = c.req.param("id");
  const usuarioId = c.get("sesion").usuario.id;
  const cuerpo = await c.req.json<{ conservar?: "a" | "b" }>().catch(() => ({}) as { conservar?: "a" | "b" });
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows } = await cliente.query<{ producto_a: string; producto_b: string }>("SELECT producto_a, producto_b FROM equivalencia_sugerida WHERE id = $1 AND estado = 'pendiente' FOR UPDATE", [id]);
    if (!rows[0]) { await cliente.query("ROLLBACK"); return c.json({ error: "La sugerencia no existe o ya se resolvió" }, 409); }
    if (accion === "unir") {
      const conservar = cuerpo.conservar === "b" ? rows[0].producto_b : rows[0].producto_a;
      const absorber = conservar === rows[0].producto_a ? rows[0].producto_b : rows[0].producto_a;
      await unirProductos(cliente, conservar, absorber);
      await cliente.query("UPDATE equivalencia_sugerida SET estado = 'unida', resuelto_en = now(), resuelto_por = $2 WHERE id = $1", [id, usuarioId]);
      await registrarEvento(cliente, { tipo: "producto.unido", usuarioId, contenido: { conservar, absorber, sugerencia: id } });
    } else {
      await cliente.query("UPDATE equivalencia_sugerida SET estado = 'rechazada', resuelto_en = now(), resuelto_por = $2 WHERE id = $1", [id, usuarioId]);
      await registrarEvento(cliente, { tipo: "equivalencia.rechazada", usuarioId, contenido: { sugerencia: id } });
    }
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
}
equivalencias.post("/:id/unir", (c) => resolver(c, "unir"));
equivalencias.post("/:id/rechazar", (c) => resolver(c, "rechazar"));

// Unión manual de dos productos cualesquiera.
equivalencias.post("/unir", async (c) => {
  const cuerpo = await c.req.json<{ conservar_id?: string; absorber_id?: string }>().catch(() => ({}) as Record<string, never>);
  if (!cuerpo.conservar_id || !cuerpo.absorber_id || cuerpo.conservar_id === cuerpo.absorber_id) return c.json({ error: "Elegí dos productos distintos" }, 400);
  const usuarioId = c.get("sesion").usuario.id;
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rowCount } = await cliente.query("SELECT 1 FROM producto WHERE id IN ($1, $2) AND activo", [cuerpo.conservar_id, cuerpo.absorber_id]);
    if (rowCount !== 2) { await cliente.query("ROLLBACK"); return c.json({ error: "Alguno de los productos no existe o ya fue unido" }, 404); }
    await unirProductos(cliente, cuerpo.conservar_id, cuerpo.absorber_id);
    await registrarEvento(cliente, { tipo: "producto.unido", usuarioId, contenido: { conservar: cuerpo.conservar_id, absorber: cuerpo.absorber_id, manual: true } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
});
