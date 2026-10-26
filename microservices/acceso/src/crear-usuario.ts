import { randomUUID } from "node:crypto";
import { asignarRoles, insertarUsuario, rolesPorNombre } from "./persistencia/administracion.js";
import { base, cerrar } from "./persistencia/conexion.js";
import { anotarEvento } from "./eventos/anotar.js";

// Alta de la primera persona, desde el contenedor:
//   docker compose exec acceso node dist/crear-usuario.js correo@gmail.com "Nombre"
// Sin más, recibe todos los roles que existen (es quien después arma el resto desde la app).
// Con un tercer dato, solo esos roles, separados por coma: "Vendedor,Recepción".
// Los nombres viejos siguen valiendo: dueño y admin son todos los roles; mostrador, Vendedor.
const [email, nombre, pedido] = process.argv.slice(2);
if (!email || !nombre) {
  console.error('Uso: crear-usuario <email> <nombre> ["Rol,Otro rol"]');
  process.exit(1);
}
const nombres = !pedido || pedido === "dueño" || pedido === "admin" ? null : pedido === "mostrador" ? ["vendedor"] : pedido.split(",").map((r) => r.trim().toLowerCase()).filter(Boolean);
const roles = await rolesPorNombre(base, nombres);
if (roles.length === 0 || (nombres && roles.length !== nombres.length)) {
  console.error(`No existe alguno de los roles pedidos: ${pedido}`);
  process.exit(1);
}
const id = randomUUID();
await insertarUsuario(base, id, email.toLowerCase(), nombre);
await asignarRoles(base, id, roles.map((r) => r.id), false);
await anotarEvento(base, { tipo: "usuario.creado", usuarioId: null, contenido: { id, email: email.toLowerCase(), roles: roles.map((r) => r.nombre), medio: "comando" } });
console.log(`usuario creado: ${email} (${roles.map((r) => r.nombre).join(", ")})`);
await cerrar();
