import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirRol, exigirSesion } from "../autenticacion.js";

// Proveedores con su configuración de costo (issue #11): si sus precios incluyen IVA,
// descuento general, descuento por contado, y qué lector entiende su planilla.
export const proveedores = new Hono();
proveedores.use("/*", exigirSesion);

proveedores.get("/", async (c) => {
  const { rows } = await pool.query(
    "SELECT id, nombre, precios_incluyen_iva, descuento_general, descuento_contado, lector, activo FROM proveedor ORDER BY nombre",
  );
  return c.json(rows);
});

type Cuerpo = { nombre?: string; precios_incluyen_iva?: boolean; descuento_general?: number; descuento_contado?: number; lector?: string | null };

function validar(cuerpo: Cuerpo, completo: boolean): string | null {
  if (completo && !cuerpo.nombre?.trim()) return "Hace falta el nombre";
  for (const campo of ["descuento_general", "descuento_contado"] as const) {
    const v = cuerpo[campo];
    if (v !== undefined && (typeof v !== "number" || v < 0 || v > 1)) return `${campo} va entre 0 y 1 (0.25 = 25 %)`;
  }
  return null;
}

proveedores.post("/", exigirRol("dueño"), async (c) => {
  const cuerpo = await c.req.json<Cuerpo>().catch(() => ({}) as Cuerpo);
  const error = validar(cuerpo, true);
  if (error) return c.json({ error }, 400);
  const id = randomUUID();
  try {
    await pool.query(
      `INSERT INTO proveedor (id, nombre, precios_incluyen_iva, descuento_general, descuento_contado, lector)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, cuerpo.nombre!.trim(), cuerpo.precios_incluyen_iva ?? false, cuerpo.descuento_general ?? 0, cuerpo.descuento_contado ?? 0, cuerpo.lector ?? null],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return c.json({ error: `Ya existe un proveedor llamado ${cuerpo.nombre}` }, 409);
    throw e;
  }
  await registrarEvento(pool, { tipo: "proveedor.creado", usuarioId: c.get("sesion").usuario.id, contenido: { id, ...cuerpo } });
  return c.json({ id }, 201);
});

proveedores.patch("/:id", exigirRol("dueño"), async (c) => {
  const cuerpo = await c.req.json<Cuerpo & { activo?: boolean }>().catch(() => ({}) as Cuerpo & { activo?: boolean });
  const error = validar(cuerpo, false);
  if (error) return c.json({ error }, 400);
  const { rowCount } = await pool.query(
    `UPDATE proveedor SET nombre = COALESCE($2, nombre), precios_incluyen_iva = COALESCE($3, precios_incluyen_iva),
       descuento_general = COALESCE($4, descuento_general), descuento_contado = COALESCE($5, descuento_contado),
       lector = CASE WHEN $6::boolean THEN $7 ELSE lector END, activo = COALESCE($8, activo)
     WHERE id = $1`,
    [c.req.param("id"), cuerpo.nombre?.trim() || null, cuerpo.precios_incluyen_iva ?? null, cuerpo.descuento_general ?? null,
      cuerpo.descuento_contado ?? null, "lector" in cuerpo, cuerpo.lector ?? null, cuerpo.activo ?? null],
  );
  if (!rowCount) return c.json({ error: "No existe ese proveedor" }, 404);
  await registrarEvento(pool, { tipo: "proveedor.modificado", usuarioId: c.get("sesion").usuario.id, contenido: { id: c.req.param("id"), cambios: cuerpo } });
  return c.body(null, 204);
});
