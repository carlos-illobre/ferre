import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { registrarEvento } from "./eventos.js";

// Alta de la primera persona, desde el contenedor:
//   docker compose exec gestion-del-local node dist/crear-usuario.js correo@gmail.com "Nombre"
// Sin más, recibe todos los roles que existen (es quien después arma el resto desde la app).
// Con un tercer dato, solo esos roles, separados por coma: "Vendedor,Recepción".
// Los nombres viejos siguen valiendo: dueño y admin son todos los roles; mostrador, Vendedor.
const [email, nombre, pedido] = process.argv.slice(2);
if (!email || !nombre) {
  console.error('Uso: crear-usuario <email> <nombre> ["Rol,Otro rol"]');
  process.exit(1);
}
const nombres = !pedido || pedido === "dueño" || pedido === "admin" ? null : pedido === "mostrador" ? ["vendedor"] : pedido.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
const { rows: roles } = await pool.query<{ id: string; nombre: string }>(
  nombres ? "SELECT id, nombre FROM rol WHERE lower(nombre) = ANY($1)" : "SELECT id, nombre FROM rol", nombres ? [nombres] : []);
if (roles.length === 0 || (nombres && roles.length !== nombres.length)) {
  console.error(`No existe alguno de los roles pedidos: ${pedido}`);
  process.exit(1);
}
const id = randomUUID();
await pool.query("INSERT INTO usuario (id, email, nombre) VALUES ($1, $2, $3)", [id, email.toLowerCase(), nombre]);
await pool.query("INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, unnest($2::uuid[])", [id, roles.map((r) => r.id)]);
await registrarEvento(pool, { tipo: "usuario.creado", usuarioId: null, contenido: { id, email: email.toLowerCase(), roles: roles.map((r) => r.nombre), medio: "comando" } });
console.log(`usuario creado: ${email} (${roles.map((r) => r.nombre).join(", ")})`);
await pool.end();
