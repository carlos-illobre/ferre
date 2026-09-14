import { Hono } from "hono";
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
  margen_elegido: number | null;
  proveedor_id: string | null; proveedor: string | null; codigo_proveedor: string | null;
  costo_neto: string | null; iva: string | null; fecha_lista: string | null; lista_importada_id: string | null; explicacion_costo: string[];
  modificado_en: string;
};

productos.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT p.id, p.descripcion, p.marca, p.codigo_barras, p.unidad, p.margen_elegido, p.modificado_en, p.sector_id, p.foto_url,
            pp.proveedor_id, pr.nombre AS proveedor, pp.codigo_proveedor, pp.costo_neto, pp.iva, pp.fecha_lista::text, pp.lista_importada_id,
            COALESCE(pp.descuentos->'explicacion', '[]'::jsonb) AS explicacion_costo,
            COALESCE(prov.lista, '[]'::json) AS proveedores
       FROM producto p
       LEFT JOIN LATERAL (
         SELECT * FROM precio_proveedor x
          WHERE x.producto_id = p.id
            AND (p.proveedor_preferido_id IS NULL OR x.proveedor_id = p.proveedor_preferido_id)
          ORDER BY x.fecha_lista DESC, x.creado_en DESC LIMIT 1
       ) pp ON true
       LEFT JOIN proveedor pr ON pr.id = pp.proveedor_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('proveedor_id', v.proveedor_id, 'proveedor', v.nombre, 'costo_neto', v.costo_neto, 'fecha_lista', v.fecha_lista, 'codigo_proveedor', v.codigo_proveedor) ORDER BY v.costo_neto) AS lista
           FROM (
             SELECT DISTINCT ON (x.proveedor_id) x.proveedor_id, pv.nombre, x.costo_neto, x.fecha_lista::text, x.codigo_proveedor
               FROM precio_proveedor x JOIN proveedor pv ON pv.id = x.proveedor_id
              WHERE x.producto_id = p.id ORDER BY x.proveedor_id, x.fecha_lista DESC, x.creado_en DESC
           ) v
       ) prov ON true
      WHERE p.activo AND p.reemplazado_por IS NULL
      ORDER BY p.descripcion`,
  );
  return c.json(rows);
});

// Elegir margen: uno de los botones (300/200/100/50/25), cualquier porcentaje entero
// tipeado a mano, o ninguno. Lo hace el empleado en el mostrador; queda auditado.
productos.patch("/:id", async (c) => {
  const cuerpo = await c.req.json<{ margen_elegido?: number | null; unidad?: string; codigo_barras?: string | null; proveedor_preferido_id?: string | null; foto_url?: string | null }>().catch(() => ({}) as Record<string, never>);
  const cambios: string[] = [];
  const valores: unknown[] = [c.req.param("id")];
  if ("margen_elegido" in cuerpo) {
    const m = cuerpo.margen_elegido;
    if (m !== null && (typeof m !== "number" || !Number.isInteger(m) || m <= 0 || m > 10000)) return c.json({ error: "El margen es un porcentaje entero mayor que cero (por ejemplo 20) o ninguno" }, 400);
    valores.push(m); cambios.push(`margen_elegido = $${valores.length}`);
  }
  if ("unidad" in cuerpo) {
    if (!["unidad", "kg", "m", "l"].includes(cuerpo.unidad as string)) return c.json({ error: "La unidad es unidad, kg, m o l" }, 400);
    valores.push(cuerpo.unidad); cambios.push(`unidad = $${valores.length}`);
  }
  if ("codigo_barras" in cuerpo) {
    const cb = cuerpo.codigo_barras === null ? null : String(cuerpo.codigo_barras).trim();
    if (cb !== null && !/^[0-9A-Za-z\-]{4,32}$/.test(cb)) return c.json({ error: "El código de barras tiene que tener entre 4 y 32 letras o números" }, 400);
    valores.push(cb); cambios.push(`codigo_barras = $${valores.length}`);
  }
  if ("proveedor_preferido_id" in cuerpo) {
    valores.push(cuerpo.proveedor_preferido_id ?? null); cambios.push(`proveedor_preferido_id = $${valores.length}`);
  }
  if ("foto_url" in cuerpo) {
    const f = cuerpo.foto_url === null ? null : String(cuerpo.foto_url).trim();
    if (f !== null && !/^https?:\/\/.{4,500}$/.test(f)) return c.json({ error: "La foto tiene que ser una dirección https" }, 400);
    valores.push(f); cambios.push(`foto_url = $${valores.length}`);
  }
  if (cambios.length === 0) return c.json({ error: "Nada que cambiar: mandá margen_elegido, unidad, codigo_barras, proveedor_preferido_id o foto_url" }, 400);
  const { rowCount } = await pool.query(`UPDATE producto SET ${cambios.join(", ")} WHERE id = $1 AND activo`, valores);
  if (!rowCount) return c.json({ error: "No existe ese producto" }, 404);
  await registrarEvento(pool, { tipo: "producto.precio_elegido", usuarioId: c.get("sesion").usuario.id, contenido: { id: c.req.param("id"), ...cuerpo } });
  return c.body(null, 204);
});
