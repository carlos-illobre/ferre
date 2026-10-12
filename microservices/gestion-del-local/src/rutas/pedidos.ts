import { randomUUID } from "node:crypto";
import { Hono, type Context } from "hono";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { registrarEvento } from "../eventos.js";
import { exigirPermiso, exigirSesion, puede } from "../autenticacion.js";

// Pedidos a proveedores (RF-55, decisión 52). Un pedido nace como borrador, se manda como
// texto (el servidor no manda nada: anota que se mandó) y el ingreso de mercadería lo va
// recibiendo (ver compras.ts). Armar, mandar, cancelar y cerrar pide «Encargar compras»;
// quien registra ingresos ve los que esperan mercadería, para ingresarla desde ellos.
export const pedidos = new Hono();
pedidos.use("/*", exigirSesion);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ESPERAN = ["enviado", "recibido_parcial"];
type ItemEntrada = { producto_id: string; cantidad: number };
type Entrada = { id?: string; proveedor_id?: string; items?: ItemEntrada[] };

function validar(v: Entrada): string | null {
  if (v.id && !UUID.test(v.id)) return "El id del pedido tiene que ser un UUID";
  if (!v.proveedor_id || !UUID.test(v.proveedor_id)) return "Elegí el proveedor";
  if (v.items !== undefined && !Array.isArray(v.items)) return "Los renglones no son válidos";
  const vistos = new Set<string>();
  for (const [i, it] of (v.items ?? []).entries()) {
    if (!it.producto_id || !UUID.test(it.producto_id)) return `El renglón ${i + 1} no tiene producto`;
    if (!(it.cantidad > 0)) return `El renglón ${i + 1} tiene cantidad inválida`;
    if (vistos.has(it.producto_id)) return `El renglón ${i + 1} repite un producto que ya está en el pedido`;
    vistos.add(it.producto_id);
  }
  return null;
}

const SELECCION = `
  SELECT pe.id, pe.estado, pe.proveedor_id, pr.nombre AS proveedor, pr.whatsapp, pe.creado_en, pe.enviado_en, pe.cerrado_en,
         ue.nombre AS enviado_por, uc.nombre AS cerrado_por,
         COALESCE((SELECT json_agg(json_build_object(
                     'producto_id', i.producto_id, 'descripcion', p.descripcion, 'marca', p.marca, 'unidad', p.unidad,
                     'codigo_proveedor', (SELECT pp.codigo_proveedor FROM precio_proveedor pp WHERE pp.producto_id = i.producto_id AND pp.proveedor_id = pe.proveedor_id ORDER BY pp.fecha_lista DESC, pp.creado_en DESC LIMIT 1),
                     'cantidad', i.cantidad, 'costo_estimado', i.costo_estimado, 'recibido', i.recibido) ORDER BY i.orden)
                     FROM item_pedido i JOIN producto p ON p.id = i.producto_id WHERE i.pedido_id = pe.id), '[]'::json) AS items
    FROM pedido pe JOIN proveedor pr ON pr.id = pe.proveedor_id
    LEFT JOIN usuario ue ON ue.id = pe.enviado_por LEFT JOIN usuario uc ON uc.id = pe.cerrado_por`;

// Los renglones se guardan con el costo de la última lista de ese proveedor, que es el estimado.
async function guardarItems(cliente: PoolClient, pedidoId: string, proveedorId: string, items: ItemEntrada[]) {
  await cliente.query("DELETE FROM item_pedido WHERE pedido_id = $1", [pedidoId]);
  for (const [orden, it] of items.entries()) {
    await cliente.query(
      `INSERT INTO item_pedido (id, pedido_id, orden, producto_id, cantidad, costo_estimado)
       VALUES ($1, $2, $3, $4, $5, (SELECT pp.costo_neto FROM precio_proveedor pp WHERE pp.producto_id = $4 AND pp.proveedor_id = $6 ORDER BY pp.fecha_lista DESC, pp.creado_en DESC LIMIT 1))`,
      [randomUUID(), pedidoId, orden + 1, it.producto_id, it.cantidad, proveedorId],
    );
  }
}

// Quien solo registra ingresos ve los pedidos que esperan mercadería y nada más.
pedidos.get("/", exigirPermiso("deposito.pedidos", "deposito.ingresos"), async (c) => {
  const todos = puede(c.get("sesion").usuario, "deposito.pedidos");
  const { rows } = await pool.query(
    `${SELECCION} ${todos ? "" : "WHERE pe.estado = ANY($1)"} ORDER BY COALESCE(pe.enviado_en, pe.creado_en) DESC LIMIT 100`,
    todos ? [] : [ESPERAN],
  );
  return c.json(rows);
});

pedidos.get("/:id", exigirPermiso("deposito.pedidos", "deposito.ingresos"), async (c) => {
  if (!UUID.test(c.req.param("id"))) return c.json({ error: "No existe ese pedido" }, 404);
  const { rows } = await pool.query(`${SELECCION} WHERE pe.id = $1`, [c.req.param("id")]);
  if (!rows[0]) return c.json({ error: "No existe ese pedido" }, 404);
  if (!puede(c.get("sesion").usuario, "deposito.pedidos") && !ESPERAN.includes(String(rows[0].estado))) return c.json({ error: "No existe ese pedido" }, 404);
  return c.json(rows[0]);
});

// Guardar el borrador: lo crea o lo reemplaza entero (proveedor y renglones). Se llama cada
// vez que cambia, por eso es la misma ruta y no falla si ya existe.
pedidos.put("/:id", exigirPermiso("deposito.pedidos"), async (c) => {
  const v = { ...(await c.req.json<Entrada>().catch(() => ({}) as Entrada)), id: c.req.param("id") };
  const error = validar(v);
  if (error) return c.json({ error }, 400);
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows: prov } = await cliente.query("SELECT nombre FROM proveedor WHERE id = $1 AND activo", [v.proveedor_id]);
    if (!prov[0]) { await cliente.query("ROLLBACK"); return c.json({ error: "No existe ese proveedor" }, 404); }
    const { rows: previo } = await cliente.query<{ estado: string }>("SELECT estado FROM pedido WHERE id = $1 FOR UPDATE", [v.id]);
    if (previo[0] && previo[0].estado !== "borrador") { await cliente.query("ROLLBACK"); return c.json({ error: "Ese pedido ya se mandó: no se puede cambiar" }, 409); }
    if (previo[0]) await cliente.query("UPDATE pedido SET proveedor_id = $1 WHERE id = $2", [v.proveedor_id, v.id]);
    else await cliente.query("INSERT INTO pedido (id, proveedor_id, creado_por) VALUES ($1, $2, $3)", [v.id, v.proveedor_id, c.get("sesion").usuario.id]);
    await guardarItems(cliente, v.id, v.proveedor_id!, v.items ?? []);
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.json({ id: v.id }, 200);
});

pedidos.delete("/:id", exigirPermiso("deposito.pedidos"), async (c) => {
  const { rowCount } = await pool.query("DELETE FROM pedido WHERE id = $1 AND estado = 'borrador'", [c.req.param("id")]);
  if (!rowCount) return c.json({ error: "Solo se borra un pedido que todavía no se mandó" }, 409);
  return c.body(null, 204);
});

// Mandar: el texto sale del celular o de la computadora (WhatsApp o copiado); acá queda
// anotado que se mandó, quién y cuándo. Si viene el WhatsApp del proveedor, se le guarda.
pedidos.post("/:id/enviar", exigirPermiso("deposito.pedidos"), async (c) => {
  const { whatsapp } = await c.req.json<{ whatsapp?: string }>().catch(() => ({}) as { whatsapp?: string });
  const numero = whatsapp === undefined ? null : String(whatsapp).replace(/\D/g, "");
  if (numero !== null && (numero.length < 8 || numero.length > 15)) return c.json({ error: "El número de WhatsApp va con código de país y de área, solo números: 5491155550101" }, 400);
  const id = c.req.param("id");
  const usuarioId = c.get("sesion").usuario.id;
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rows } = await cliente.query<{ estado: string; proveedor_id: string; proveedor: string; renglones: string }>(
      `SELECT pe.estado, pe.proveedor_id, pr.nombre AS proveedor, (SELECT count(*) FROM item_pedido i WHERE i.pedido_id = pe.id) AS renglones
         FROM pedido pe JOIN proveedor pr ON pr.id = pe.proveedor_id WHERE pe.id = $1 FOR UPDATE OF pe`, [id]);
    if (!rows[0]) { await cliente.query("ROLLBACK"); return c.json({ error: "No existe ese pedido" }, 404); }
    if (rows[0].estado !== "borrador") { await cliente.query("ROLLBACK"); return c.json({ error: "Ese pedido ya se mandó" }, 409); }
    if (Number(rows[0].renglones) === 0) { await cliente.query("ROLLBACK"); return c.json({ error: "El pedido no tiene productos" }, 400); }
    await cliente.query("UPDATE pedido SET estado = 'enviado', enviado_por = $1, enviado_en = now() WHERE id = $2", [usuarioId, id]);
    if (numero) await cliente.query("UPDATE proveedor SET whatsapp = $1 WHERE id = $2", [numero, rows[0].proveedor_id]);
    await registrarEvento(cliente, { tipo: "pedido.enviado", usuarioId, contenido: { id, proveedor: rows[0].proveedor, renglones: Number(rows[0].renglones) } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
});

// Cancelar el que se mandó y no va a llegar; cerrar el que llegó incompleto y cuyo resto no va a llegar.
const cerrar = (desde: string, hasta: string, evento: string, rechazo: string) => async (c: Context) => {
  const id = c.req.param("id");
  const usuarioId = c.get("sesion").usuario.id;
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rowCount } = await cliente.query("UPDATE pedido SET estado = $1, cerrado_por = $2, cerrado_en = now() WHERE id = $3 AND estado = $4", [hasta, usuarioId, id, desde]);
    if (!rowCount) { await cliente.query("ROLLBACK"); return c.json({ error: rechazo }, 409); }
    await registrarEvento(cliente, { tipo: evento, usuarioId, contenido: { id } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
};
pedidos.post("/:id/cancelar", exigirPermiso("deposito.pedidos"), cerrar("enviado", "cancelado", "pedido.cancelado", "Solo se cancela un pedido enviado que todavía no recibió mercadería"));
pedidos.post("/:id/cerrar", exigirPermiso("deposito.pedidos"), cerrar("recibido_parcial", "cerrado_incompleto", "pedido.cerrado", "Solo se cierra un pedido que llegó incompleto"));
