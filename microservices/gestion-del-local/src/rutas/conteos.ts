import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";

// Sectores y conteos (issue #31). Se cuenta de a un sector; el conteo queda abierto hasta
// que se cierra; al cerrar, cada diferencia contra el stock teórico es un ajuste con la
// nota "conteo de <sector> del <fecha>", y los productos del sector que no se contaron se
// pueden poner en cero de una vez o dejar como están.
export const sectores = new Hono();
export const conteos = new Hono();
sectores.use("/*", exigirSesion);
conteos.use("/*", exigirSesion);

sectores.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT s.id, s.nombre, s.orden,
            (SELECT count(*) FROM producto p WHERE p.sector_id = s.id AND p.activo) AS productos,
            (SELECT max(cerrado_en) FROM conteo co WHERE co.sector_id = s.id AND co.estado = 'cerrado') AS ultimo_conteo,
            (SELECT id FROM conteo co WHERE co.sector_id = s.id AND co.estado = 'abierto') AS conteo_abierto
       FROM sector s WHERE s.activo ORDER BY s.orden, s.nombre`,
  );
  return c.json(rows);
});

sectores.post("/", async (c) => {
  const cuerpo = await c.req.json<{ nombre?: string }>().catch(() => ({}) as { nombre?: string });
  const nombre = cuerpo.nombre?.trim();
  if (!nombre) return c.json({ error: "Hace falta el nombre del sector (por ejemplo: Góndola 1)" }, 400);
  const id = randomUUID();
  try {
    await pool.query("INSERT INTO sector (id, nombre, orden) VALUES ($1, $2, (SELECT COALESCE(max(orden), 0) + 1 FROM sector))", [id, nombre]);
  } catch (e) {
    if ((e as { code?: string }).code === "23505") return c.json({ error: `Ya existe un sector llamado ${nombre}` }, 409);
    throw e;
  }
  await registrarEvento(pool, { tipo: "sector.creado", usuarioId: c.get("sesion").usuario.id, contenido: { id, nombre } });
  return c.json({ id, nombre }, 201);
});

// Abrir (o retomar) el conteo de un sector.
conteos.post("/", async (c) => {
  const cuerpo = await c.req.json<{ sector_id?: string }>().catch(() => ({}) as { sector_id?: string });
  if (!cuerpo.sector_id) return c.json({ error: "Elegí el sector" }, 400);
  const { rows: abiertos } = await pool.query<{ id: string }>("SELECT id FROM conteo WHERE sector_id = $1 AND estado = 'abierto'", [cuerpo.sector_id]);
  if (abiertos[0]) return c.json({ id: abiertos[0].id, retomado: true });
  const id = randomUUID();
  await pool.query("INSERT INTO conteo (id, sector_id, abierto_por) VALUES ($1, $2, $3)", [id, cuerpo.sector_id, c.get("sesion").usuario.id]);
  await registrarEvento(pool, { tipo: "conteo.abierto", usuarioId: c.get("sesion").usuario.id, contenido: { id, sectorId: cuerpo.sector_id } });
  return c.json({ id, retomado: false }, 201);
});

conteos.get("/:id", async (c) => {
  const { rows: cab } = await pool.query(
    `SELECT co.id, co.estado, co.abierto_en, co.cerrado_en, co.resumen, s.id AS sector_id, s.nombre AS sector FROM conteo co JOIN sector s ON s.id = co.sector_id WHERE co.id = $1`,
    [c.req.param("id")],
  );
  if (!cab[0]) return c.json({ error: "No existe ese conteo" }, 404);
  const { rows: renglones } = await pool.query(
    `SELECT r.producto_id, r.cantidad_contada, r.contado_en, p.descripcion, p.marca,
            COALESCE((SELECT sum(cantidad) FROM movimiento_stock m WHERE m.producto_id = r.producto_id), 0) AS stock_teorico
       FROM renglon_conteo r JOIN producto p ON p.id = r.producto_id WHERE r.conteo_id = $1 ORDER BY r.contado_en DESC`,
    [c.req.param("id")],
  );
  // Productos del sector todavía no contados en este conteo.
  const { rows: sinContar } = await pool.query(
    `SELECT p.id AS producto_id, p.descripcion, p.marca,
            COALESCE((SELECT sum(cantidad) FROM movimiento_stock m WHERE m.producto_id = p.id), 0) AS stock_teorico
       FROM producto p WHERE p.sector_id = $2 AND p.activo AND p.id NOT IN (SELECT producto_id FROM renglon_conteo WHERE conteo_id = $1)
      ORDER BY p.descripcion`,
    [c.req.param("id"), cab[0].sector_id],
  );
  return c.json({ ...cab[0], renglones, sin_contar: sinContar });
});

// Contar un producto (o corregir lo contado). El producto pasa a ser de este sector.
conteos.put("/:id/renglones/:productoId", async (c) => {
  const cuerpo = await c.req.json<{ cantidad?: number }>().catch(() => ({}) as { cantidad?: number });
  if (typeof cuerpo.cantidad !== "number" || !Number.isFinite(cuerpo.cantidad) || cuerpo.cantidad < 0) return c.json({ error: "Decí cuántas hay (un número mayor o igual a cero)" }, 400);
  const { rows } = await pool.query<{ sector_id: string }>("SELECT sector_id FROM conteo WHERE id = $1 AND estado = 'abierto'", [c.req.param("id")]);
  if (!rows[0]) return c.json({ error: "El conteo no existe o ya se cerró" }, 409);
  const usuarioId = c.get("sesion").usuario.id;
  await pool.query(
    `INSERT INTO renglon_conteo (id, conteo_id, producto_id, cantidad_contada, contado_por) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (conteo_id, producto_id) DO UPDATE SET cantidad_contada = EXCLUDED.cantidad_contada, contado_en = now(), contado_por = EXCLUDED.contado_por`,
    [randomUUID(), c.req.param("id"), c.req.param("productoId"), cuerpo.cantidad, usuarioId],
  );
  await pool.query("UPDATE producto SET sector_id = $2 WHERE id = $1 AND (sector_id IS NULL OR sector_id <> $2)", [c.req.param("productoId"), rows[0].sector_id]);
  return c.body(null, 204);
});

conteos.delete("/:id/renglones/:productoId", async (c) => {
  await pool.query("DELETE FROM renglon_conteo WHERE conteo_id = $1 AND producto_id = $2 AND EXISTS (SELECT 1 FROM conteo WHERE id = $1 AND estado = 'abierto')", [c.req.param("id"), c.req.param("productoId")]);
  return c.body(null, 204);
});

// Cerrar: las diferencias pasan a ser ajustes. faltantes_en_cero: los productos del sector
// que no se contaron se dan por inexistentes (ajuste a cero).
conteos.post("/:id/cerrar", async (c) => {
  const cuerpo = await c.req.json<{ faltantes_en_cero?: boolean }>().catch(() => ({}) as { faltantes_en_cero?: boolean });
  const id = c.req.param("id");
  const usuarioId = c.get("sesion").usuario.id;
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows: cab } = await cliente.query<{ sector_id: string; sector: string }>(
      "SELECT co.sector_id, s.nombre AS sector FROM conteo co JOIN sector s ON s.id = co.sector_id WHERE co.id = $1 AND co.estado = 'abierto' FOR UPDATE",
      [id],
    );
    if (!cab[0]) { await cliente.query("ROLLBACK"); return c.json({ error: "El conteo no existe o ya se cerró" }, 409); }
    const hoy = new Date();
    const nota = `conteo de ${cab[0].sector} del ${hoy.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}`;
    const { rows: renglones } = await cliente.query<{ producto_id: string; cantidad_contada: string; stock_teorico: string }>(
      `SELECT r.producto_id, r.cantidad_contada, COALESCE((SELECT sum(cantidad) FROM movimiento_stock m WHERE m.producto_id = r.producto_id), 0) AS stock_teorico
         FROM renglon_conteo r WHERE r.conteo_id = $1`,
      [id],
    );
    const resumen = { contados: renglones.length, ajustados: 0, sin_contar: 0, puestos_en_cero: 0, diferencia_unidades: 0 };
    for (const r of renglones) {
      const dif = Number(r.cantidad_contada) - Number(r.stock_teorico);
      if (Math.abs(dif) < 0.0005) continue;
      await cliente.query(
        `INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha, nota) VALUES ($1, $2, 'ajuste', $3, 'conteo', $4, now(), $5)`,
        [randomUUID(), r.producto_id, dif, id, `${nota}: había ${Number(r.stock_teorico)}, hay ${Number(r.cantidad_contada)}`],
      );
      resumen.ajustados++;
      resumen.diferencia_unidades += dif;
    }
    const { rows: sinContar } = await cliente.query<{ id: string; stock_teorico: string }>(
      `SELECT p.id, COALESCE((SELECT sum(cantidad) FROM movimiento_stock m WHERE m.producto_id = p.id), 0) AS stock_teorico
         FROM producto p WHERE p.sector_id = $2 AND p.activo AND p.id NOT IN (SELECT producto_id FROM renglon_conteo WHERE conteo_id = $1)`,
      [id, cab[0].sector_id],
    );
    resumen.sin_contar = sinContar.length;
    if (cuerpo.faltantes_en_cero) {
      for (const p of sinContar) {
        const teorico = Number(p.stock_teorico);
        if (Math.abs(teorico) < 0.0005) continue;
        await cliente.query(
          `INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, referencia_id, fecha, nota) VALUES ($1, $2, 'ajuste', $3, 'conteo', $4, now(), $5)`,
          [randomUUID(), p.id, -teorico, id, `${nota}: no se encontró ninguno (había ${teorico})`],
        );
        resumen.puestos_en_cero++;
        resumen.diferencia_unidades -= teorico;
      }
    }
    await cliente.query("UPDATE conteo SET estado = 'cerrado', cerrado_en = now(), cerrado_por = $2, resumen = $3 WHERE id = $1", [id, usuarioId, JSON.stringify(resumen)]);
    await registrarEvento(cliente, { tipo: "conteo.cerrado", usuarioId, contenido: { id, sector: cab[0].sector, ...resumen } });
    await cliente.query("COMMIT");
    return c.json({ id, sector: cab[0].sector, ...resumen });
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
});
