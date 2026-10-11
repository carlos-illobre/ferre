import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import type pg from "pg";
import { pool } from "../db.js";
import { exigirPermiso, exigirSesion } from "../autenticacion.js";
import { registrarEvento } from "../eventos.js";
import { quedaQuienAdministre } from "./roles.js";

// Usuarios autorizados (RF-70, RF-72, RF-75). Se autoriza a una persona con su correo de
// Google y uno o más roles; sus permisos son la unión de los de sus roles. Para que no pueda
// nada se la desactiva. Nunca queda el sistema sin quien administre usuarios y roles.
export const usuarios = new Hono();
usuarios.use("/*", exigirSesion, exigirPermiso("admin.usuarios"));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIN_QUIEN_ADMINISTRE = "No se guardó: el sistema se quedaría sin nadie que pueda administrar usuarios y roles";

// Los ids de rol pedidos, si son válidos y existen. Un usuario activo tiene al menos un rol.
async function rolesValidos(db: Pick<pg.Pool, "query">, roles: unknown): Promise<string[] | string> {
  if (!Array.isArray(roles) || roles.length === 0) return "Elegí al menos un rol. Para que no pueda nada, desactivá al usuario";
  const ids = [...new Set(roles.map(String))];
  if (ids.some((id) => !UUID.test(id))) return "Hay un rol que no existe";
  const { rows } = await db.query<{ id: string }>("SELECT id FROM rol WHERE id = ANY($1::uuid[])", [ids]);
  return rows.length === ids.length ? ids : "Hay un rol que no existe";
}

usuarios.get("/", async (c) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.nombre, u.activo, u.creado_en,
            COALESCE((SELECT json_agg(json_build_object('id', r.id, 'nombre', r.nombre) ORDER BY r.nombre) FROM usuario_rol ur JOIN rol r ON r.id = ur.rol_id WHERE ur.usuario_id = u.id), '[]'::json) AS roles
       FROM usuario u ORDER BY u.creado_en`,
  );
  return c.json(rows);
});

usuarios.post("/", async (c) => {
  const cuerpo = await c.req.json<{ email?: string; nombre?: string; roles?: unknown }>().catch(() => ({}) as Record<string, never>);
  const email = cuerpo.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) return c.json({ error: "Hace falta un correo válido" }, 400);
  if (!cuerpo.nombre?.trim()) return c.json({ error: "Hace falta el nombre" }, 400);
  const roles = await rolesValidos(pool, cuerpo.roles);
  if (typeof roles === "string") return c.json({ error: roles }, 400);
  const id = randomUUID();
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    await cliente.query("INSERT INTO usuario (id, email, nombre) VALUES ($1, $2, $3)", [id, email, cuerpo.nombre.trim()]);
    await cliente.query("INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, unnest($2::uuid[])", [id, roles]);
    await registrarEvento(cliente, { tipo: "usuario.creado", usuarioId: c.get("sesion").usuario.id, contenido: { id, email, roles } });
    await cliente.query("COMMIT");
  } catch (error) {
    await cliente.query("ROLLBACK");
    if ((error as { code?: string }).code === "23505") return c.json({ error: `${email} ya existe` }, 409);
    throw error;
  } finally {
    cliente.release();
  }
  return c.json({ id, email, nombre: cuerpo.nombre.trim(), activo: true }, 201);
});

usuarios.patch("/:id", async (c) => {
  const cuerpo = await c.req.json<{ roles?: unknown; activo?: boolean; nombre?: string }>().catch(() => ({}) as Record<string, never>);
  const id = c.req.param("id");
  const actor = c.get("sesion").usuario;
  if (actor.id === id && cuerpo.activo === false) return c.json({ error: "No podés desactivarte a vos mismo: lo tiene que hacer otra persona" }, 400);
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const { rowCount } = await cliente.query("UPDATE usuario SET activo = COALESCE($2, activo), nombre = COALESCE($3, nombre) WHERE id = $1", [id, cuerpo.activo ?? null, cuerpo.nombre?.trim() || null]);
    if (!rowCount) { await cliente.query("ROLLBACK"); return c.json({ error: "No existe ese usuario" }, 404); }
    if (cuerpo.roles !== undefined) {
      const roles = await rolesValidos(cliente, cuerpo.roles);
      if (typeof roles === "string") { await cliente.query("ROLLBACK"); return c.json({ error: roles }, 400); }
      await cliente.query("DELETE FROM usuario_rol WHERE usuario_id = $1", [id]);
      await cliente.query("INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, unnest($2::uuid[])", [id, roles]);
    }
    // Las dos reglas se miran con el cambio ya aplicado, antes de confirmarlo.
    const quien = await quedaQuienAdministre(cliente);
    if (!quien.alguien) { await cliente.query("ROLLBACK"); return c.json({ error: SIN_QUIEN_ADMINISTRE }, 409); }
    if (actor.id === id && !quien.usuarios.includes(id)) { await cliente.query("ROLLBACK"); return c.json({ error: "No podés quitarte a vos mismo los permisos de administrar: lo tiene que hacer otra persona" }, 400); }
    if (cuerpo.activo === false) await cliente.query("UPDATE sesion SET revocada_en = now() WHERE usuario_id = $1 AND revocada_en IS NULL", [id]);
    await registrarEvento(cliente, { tipo: "usuario.modificado", usuarioId: actor.id, contenido: { id, cambios: cuerpo } });
    await cliente.query("COMMIT");
  } catch (e) {
    await cliente.query("ROLLBACK");
    throw e;
  } finally {
    cliente.release();
  }
  return c.body(null, 204);
});
