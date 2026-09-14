import { Hono } from "hono";
import { MARGENES, type Margen } from "@ferre/calculo-de-precios";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirSesion } from "../autenticacion.js";

// El catálogo para el mostrador (issues #13 y #14): cada producto con su costo vigente
// (la fila más reciente de precio_proveedor) y el margen o precio manual elegidos. El
// cliente lo baja entero y busca en memoria; el precio de venta lo calcula la librería
// compartida, igual acá que en el navegador.
export const productos = new Hono();
productos.use("/*", exigirSesion);

export type ProductoCatalogo = {
  id: string; descripcion: string; marca: string | null; codigo_barras: string | null; unidad: string;
  margen_elegido: Margen | null; precio_manual: string | null;
  proveedor_id: string | null; proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; explicacion_costo: string[];
  modificado_en: string;
};

productos.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.descripcion, p.marca, p.codigo_barras, p.unidad, p.margen_elegido, p.precio_manual, p.modificado_en, p.sector_id,
            pp.proveedor_id, pr.nombre AS proveedor, pp.codigo_proveedor, pp.costo_neto, pp.iva, pp.fecha_lista::text,
            COALESCE(pp.descuentos->'explicacion', '[]'::jsonb) AS explicacion_costo
       FROM producto p
       LEFT JOIN LATERAL (
         SELECT * FROM precio_proveedor x
          WHERE x.producto_id = p.id
            AND (p.proveedor_preferido_id IS NULL OR x.proveedor_id = p.proveedor_preferido_id)
          ORDER BY x.fecha_lista DESC, x.creado_en DESC LIMIT 1
       ) pp ON true
       LEFT JOIN proveedor pr ON pr.id = pp.proveedor_id
      WHERE p.activo
      ORDER BY p.descripcion`,
  );
  return c.json(rows);
});

// Elegir margen (300/200/100/50/25 o ninguno) o fijar un precio a mano. Lo hace el
// empleado en el mostrador; queda auditado con quién y cuándo.
productos.patch("/:id", async (c) => {
  const cuerpo = await c.req.json<{ margen_elegido?: number | null; precio_manual?: number | null; codigo_barras?: string | null }>().catch(() => ({}) as Record<string, never>);
  const cambios: string[] = [];
  const valores: unknown[] = [c.req.param("id")];
  if ("margen_elegido" in cuerpo) {
    const m = cuerpo.margen_elegido;
    if (m !== null && !MARGENES.includes(m as Margen)) return c.json({ error: `El margen es uno de ${MARGENES.join(", ")} o ninguno` }, 400);
    valores.push(m); cambios.push(`margen_elegido = $${valores.length}`);
  }
  if ("precio_manual" in cuerpo) {
    const p = cuerpo.precio_manual;
    if (p !== null && (typeof p !== "number" || !Number.isFinite(p) || p < 0)) return c.json({ error: "El precio tiene que ser un número mayor o igual a cero" }, 400);
    valores.push(p); cambios.push(`precio_manual = $${valores.length}`);
  }
  if ("codigo_barras" in cuerpo) {
    const cb = cuerpo.codigo_barras === null ? null : String(cuerpo.codigo_barras).trim();
    if (cb !== null && !/^[0-9A-Za-z\-]{4,32}$/.test(cb)) return c.json({ error: "El código de barras tiene que tener entre 4 y 32 letras o números" }, 400);
    valores.push(cb); cambios.push(`codigo_barras = $${valores.length}`);
  }
  if (cambios.length === 0) return c.json({ error: "Nada que cambiar: mandá margen_elegido, precio_manual o codigo_barras" }, 400);
  const { rowCount } = await pool.query(`UPDATE producto SET ${cambios.join(", ")} WHERE id = $1 AND activo`, valores);
  if (!rowCount) return c.json({ error: "No existe ese producto" }, 404);
  await registrarEvento(pool, { tipo: "producto.precio_elegido", usuarioId: c.get("sesion").usuario.id, contenido: { id: c.req.param("id"), ...cuerpo } });
  return c.body(null, 204);
});
