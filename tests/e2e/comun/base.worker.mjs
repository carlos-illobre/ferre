// El hilo que tiene abierta la conexión a la base de las pruebas (lo arranca stack.ts).
// Recibe una consulta, la corre y contesta con lo mismo que imprimiría `psql -tA`.
import { workerData } from "node:worker_threads";
import pg from "pg";

const { puerto, aviso, mensajes } = workerData;
// Todo como texto, igual que psql: sin convertir números, fechas ni booleanos.
const cliente = new pg.Client({ host: "127.0.0.1", port: puerto, user: "mostrador", password: process.env.CLAVE_BASE_MOSTRADOR, database: "mostrador", types: { getTypeParser: () => (v) => v } });
const conectado = cliente.connect();

const CON_CANTIDAD = new Set(["UPDATE", "DELETE", "MERGE", "COPY", "FETCH", "MOVE", "SELECT"]);
function comoPsql(resultado) {
  const lineas = [];
  for (const r of Array.isArray(resultado) ? resultado : [resultado]) {
    if (r.fields.length > 0) for (const fila of r.rows) lineas.push(fila.map((v) => v ?? "").join("|"));
    if (r.command === "SELECT" || !r.command) continue;
    lineas.push(r.command === "INSERT" ? `INSERT 0 ${r.rowCount}` : CON_CANTIDAD.has(r.command) ? `${r.command} ${r.rowCount}` : r.command);
  }
  return lineas.join("\n").trim();
}

mensajes.on("message", async (sql) => {
  let respuesta;
  try {
    await conectado;
    respuesta = { salida: comoPsql(await cliente.query({ text: sql, rowMode: "array" })) };
  } catch (e) {
    respuesta = { error: e instanceof Error ? e.message : String(e) };
  }
  mensajes.postMessage(respuesta);
  Atomics.store(aviso, 0, 1);
  Atomics.notify(aviso, 0);
});
