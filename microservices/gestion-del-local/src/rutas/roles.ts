import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type pg from "pg";
import { pool } from "../db.js";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import { registrarEvento } from "../eventos.js";
import { CLAVES_DE_PERMISO, PARA_ADMINISTRAR, PERMISOS } from "../permisos.js";

// Los roles los arma el negocio (RF-75, ADR-017): un nombre y un grupo de permisos. Los
// permisos son fijos y se listan en /permisos. Un rol no se borra si alguien lo tiene, dos
// roles no se llaman igual, y ningún cambio puede dejar al sistema sin quien lo administre.
export const roles = new Hono();
export const permisos = new Hono();
permisos.use("/*", exigirSesion);
roles.use("/*", exigirSesion);

const SIN_QUIEN_ADMINISTRE = "No se guardó: el sistema se quedaría sin nadie que pueda administrar usuarios y roles";

// Quiénes, entre los usuarios activos, pueden administrar usuarios y roles (los dos permisos).
// Se consulta dentro de la transacción, con el cambio ya aplicado, antes de confirmarlo.
export async function quedaQuienAdministre(db: Pick<pg.Pool, "query">): Promise<{ alguien: boolean; usuarios: string[] }> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT u.id FROM usuario u
      WHERE u.activo AND (SELECT count(DISTINCT rp.permiso) FROM usuario_rol ur JOIN rol_permiso rp ON rp.rol_id = ur.rol_id
                           WHERE ur.usuario_id = u.id AND rp.permiso = ANY($1::text[])) = $2`,
    [PARA_ADMINISTRAR, PARA_ADMINISTRAR.length],
  );
  return { alguien: rows.length > 0, usuarios: rows.map((r) => r.id) };
}

function validar(cuerpo: { nombre?: unknown; permisos?: unknown }, parcial: boolean): string | null {
  if (!parcial || cuerpo.nombre !== undefined) {
    if (typeof cuerpo.nombre !== "string" || !cuerpo.nombre.trim()) return "Poné el nombre del rol";
    if (cuerpo.nombre.trim().length > 40) return "El nombre del rol tiene hasta 40 letras";
  }
  if (!parcial || cuerpo.permisos !== undefined) {
    if (!Array.isArray(cuerpo.permisos) || cuerpo.permisos.length === 0) return "Elegí al menos un permiso para el rol";
    const raro = cuerpo.permisos.find((p) => !CLAVES_DE_PERMISO.includes(String(p)));
    if (raro !== undefined) return `No existe el permiso ${String(raro)}`;
  }
  return null;
}

// La lista de permisos, para armar un rol. La ve quien administra roles o usuarios.
permisos.get("/", exigirPermiso("admin.roles", "admin.usuarios"), (c) => c.json(PERMISOS));

// Los roles con sus permisos y cuántas personas activas los tienen. También los ve quien
// administra usuarios, para poder asignarlos.
roles.get("/", exigirPermiso("admin.roles", "admin.usuarios"), async (c) => {
  const { rows } = await pool.query(
    `SELECT r.id, r.nombre, r.descripcion,
            COALESCE((SELECT array_agg(rp.permiso ORDER BY rp.permiso) FROM rol_permiso rp WHERE rp.rol_id = r.id), '{}') AS permisos,
            (SELECT count(*)::int FROM usuario_rol ur JOIN usuario u ON u.id = ur.usuario_id WHERE ur.rol_id = r.id AND u.activo) AS usuarios
       FROM rol r ORDER BY r.creado_en, r.nombre`,
  );
  return c.json(rows);
});

roles.post("/", exigirPermiso("admin.roles"), async (c) => {
  const cuerpo = await c.req.json<{ nombre?: string; descripcion?: string; permisos?: string[] }>().catch(() => ({}) as Record<string, never>);
  const error = validar(cuerpo, false);
  if (error) return c.json({ error }, 400);
  const id = randomUUID();
  const nombre = cuerpo.nombre!.trim();
  const lista = [...new Set(cuerpo.permisos!)];
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("INSERT INTO rol (id, nombre, descripcion) VALUES ($1, $2, $3)", [id, nombre, cuerpo.descripcion?.trim() || null]);
    await cliente.query("INSERT INTO rol_permiso (rol_id, permiso) SELECT $1, unnest($2::text[])", [id, lista]);
    await registrarEvento(cliente, { tipo: "rol.creado", usuarioId: c.get("sesion").usuario.id, contenido: { id, nombre, permisos: lista } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    if ((e as { code?: string }).code === "23505") return c.json({ error: `Ya hay un rol que se llama ${nombre}` }, 409);
    throw e;
  } finally {
    cliente.release();
  }
  return c.json({ id, nombre, permisos: lista }, 201);
});

roles.patch("/:id", exigirPermiso("admin.roles"), async (c) => {
  const cuerpo = await c.req.json<{ nombre?: string; descripcion?: string; permisos?: string[] }>().catch(() => ({}) as Record<string, never>);
  const error = validar(cuerpo, true);
  if (error) return c.json({ error }, 400);
  const id = c.req.param("id");
  const actor = c.get("sesion").usuario;
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rowCount } = await cliente.query("UPDATE rol SET nombre = COALESCE($2, nombre), descripcion = COALESCE($3, descripcion) WHERE id = $1", [id, cuerpo.nombre?.trim() || null, cuerpo.descripcion?.trim() ?? null]);
    if (!rowCount) { await cliente.query("ROLLBACK"); return c.json({ error: "No existe ese rol" }, 404); }
    if (cuerpo.permisos) {
      await cliente.query("DELETE FROM rol_permiso WHERE rol_id = $1", [id]);
      await cliente.query("INSERT INTO rol_permiso (rol_id, permiso) SELECT $1, unnest($2::text[])", [id, [...new Set(cuerpo.permisos)]]);
      const quien = await quedaQuienAdministre(cliente);
      if (!quien.alguien) { await cliente.query("ROLLBACK"); return c.json({ error: SIN_QUIEN_ADMINISTRE }, 409); }
      if (!quien.usuarios.includes(actor.id)) { await cliente.query("ROLLBACK"); return c.json({ error: "No podés quitarte a vos mismo los permisos de administrar: lo tiene que hacer otra persona" }, 400); }
    }
    await registrarEvento(cliente, { tipo: "rol.modificado", usuarioId: actor.id, contenido: { id, cambios: cuerpo } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    if ((e as { code?: string }).code === "23505") return c.json({ error: `Ya hay un rol que se llama ${cuerpo.nombre?.trim()}` }, 409);
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
});

roles.delete("/:id", exigirPermiso("admin.roles"), async (c) => {
  const id = c.req.param("id");
  const { rows } = await pool.query<{ nombre: string; usuarios: number }>(
    "SELECT r.nombre, (SELECT count(*)::int FROM usuario_rol ur WHERE ur.rol_id = r.id) AS usuarios FROM rol r WHERE r.id = $1", [id]);
  if (!rows[0]) return c.json({ error: "No existe ese rol" }, 404);
  // Un rol que alguien tiene no se borra: primero hay que sacárselo. Así tampoco puede quedar
  // el sistema sin quien administre por borrar un rol.
  if (rows[0].usuarios > 0) return c.json({ error: `${rows[0].nombre} no se puede borrar: ${rows[0].usuarios === 1 ? "lo tiene 1 persona" : `lo tienen ${rows[0].usuarios} personas`}. Primero sacáselo` }, 409);
  await pool.query("DELETE FROM rol WHERE id = $1", [id]);
  await registrarEvento(pool, { tipo: "rol.borrado", usuarioId: c.get("sesion").usuario.id, contenido: { id, nombre: rows[0].nombre } });
  return c.body(null, 204);
});
