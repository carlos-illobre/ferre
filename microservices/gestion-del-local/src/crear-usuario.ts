import { randomUUID } from "node:crypto";
import { pool } from "./db.js";
import { registrarEvento } from "./eventos.js";

// Alta del primer dueño, desde el contenedor:
//   docker compose exec gestion-del-local node dist/crear-usuario.js correo@gmail.com "Nombre" dueño
// Los siguientes usuarios se cargan desde la app.
const [email, nombre, rol = "dueño"] = process.argv.slice(2);
if (!email || !nombre || (rol !== "dueño" && rol !== "mostrador")) {
  console.error("Uso: crear-usuario <email> <nombre> [dueño|mostrador]");
  process.exit(1);
}
const id = randomUUID();
await pool.query("INSERT INTO usuario (id, email, nombre, rol) VALUES ($1, $2, $3, $4)", [id, email.toLowerCase(), nombre, rol]);
await registrarEvento(pool, { tipo: "usuario.creado", usuarioId: null, contenido: { id, email: email.toLowerCase(), rol, medio: "comando" } });
console.log(`usuario ${rol} creado: ${email}`);
await pool.end();
