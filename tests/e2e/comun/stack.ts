import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MessageChannel, receiveMessageOnPort, Worker } from "node:worker_threads";

// El stack contra el que corre cada interfaz: la dirección de la API y la base.
//
// Por defecto las dos interfaces usan el del compose del repositorio, en :80 (así corre el CI:
// un job por interfaz). Para correr las dos a la vez, tests/e2e.sh levanta un segundo stack
// para el celular y lo dice en E2E_CELULAR_COMPOSE (los argumentos de `docker compose`) y
// E2E_CELULAR_API: cada interfaz tiene su base y no se pisan los datos.
export type Interfaz = "escritorio" | "celular";

const RAIZ = fileURLToPath(new URL("../../../", import.meta.url));
const conexiones = new Map<string, (sql: string) => string>();

type Consulta = (sql: string) => string;

export function stack(interfaz: Interfaz): { API: string; psql: Consulta; psqlAcceso: Consulta; idsDe: (email: string) => string; psqlProcesos: Consulta; psqlAuditoria: Consulta; psqlTickets: Consulta } {
  const propio = interfaz === "celular" && process.env.E2E_CELULAR_COMPOSE;
  const compose = ["compose", ...(propio ? process.env.E2E_CELULAR_COMPOSE!.split(" ").filter(Boolean) : [])];
  const API = propio ? process.env.E2E_CELULAR_API! : (process.env.API_URL ?? "http://localhost");
  // Procesos tiene su propia base (specs/022, E08): lo suyo se consulta ahí, por el contenedor.
  const psqlProcesos = (sql: string) => execFileSync("docker", [...compose, "exec", "-T", "db", "psql", "-U", "procesos", "-d", "procesos", "-tAc", sql], { cwd: RAIZ, encoding: "utf8" }).trim();
  // Quién hizo qué está en la base de Auditoría (specs/027). Le llega un momento después de la
  // acción: se consulta con expect.poll.
  const psqlAuditoria = (sql: string) => execFileSync("docker", [...compose, "exec", "-T", "db", "psql", "-U", "auditoria", "-d", "auditoria", "-tAc", sql], { cwd: RAIZ, encoding: "utf8" }).trim();
  // Los tickets están en la base de Tickets (specs/028).
  const psqlTickets = (sql: string) => execFileSync("docker", [...compose, "exec", "-T", "db", "psql", "-U", "tickets", "-d", "tickets", "-tAc", sql], { cwd: RAIZ, encoding: "utf8" }).trim();
  // Las personas y sus sesiones están en la base de Acceso (specs/029): ahí se siembran.
  const psqlAcceso: Consulta = (sql) => conexion(compose, "acceso", process.env.CLAVE_BASE_ACCESO)(sql);
  // Lo que Comercial guarda de una persona es solo su identificador: para buscar lo suyo por correo,
  // la lista de sus identificadores (o NULL, que no encuentra nada).
  const idsDe = (email: string) => psqlAcceso(`SELECT coalesce(string_agg(quote_literal(id::text), ','), 'NULL') FROM usuario WHERE email = '${email}'`);
  return { API, psql: (sql) => conexion(compose, "mostrador", process.env.CLAVE_BASE_MOSTRADOR)(sql), psqlAcceso, idsDe, psqlProcesos, psqlAuditoria, psqlTickets };
}

// Una consulta como `psql -tA`: filas con las columnas separadas por «|» y, en lo que no es
// SELECT, la etiqueta del comando. Va por una sola conexión abierta durante toda la corrida
// (abrir `psql` en el contenedor por cada consulta costaba 0,2 s, y son cientos).
function conexion(compose: string[], base: string, clave: string | undefined): Consulta {
  const cual = `${compose.join(" ")} ${base}`;
  let consultar = conexiones.get(cual);
  if (!consultar) {
    consultar = conectar(compose, base, clave);
    conexiones.set(cual, consultar);
  }
  return consultar;
}

function conectar(compose: string[], base: string, clave: string | undefined): Consulta {
  // El puerto en el que este compose publica su base: así se llega a esa base y no a otra
  // que esté escuchando en la máquina.
  let puerto = "";
  try { puerto = execFileSync("docker", [...compose, "port", "db", "5432"], { cwd: RAIZ, encoding: "utf8" }).trim().split("\n")[0]!.split(":").pop() ?? ""; } catch { /* sin puerto publicado */ }
  if (!puerto) {
    // La base no está publicada (sin puerto publicado): por el contenedor.
    return (sql) => execFileSync("docker", [...compose, "exec", "-T", "db", "psql", "-U", base, "-d", base, "-tAc", sql], { cwd: RAIZ, encoding: "utf8" }).trim();
  }
  // El cliente de PostgreSQL es asíncrono y las pruebas consultan de forma sincrónica: la
  // consulta va a un hilo aparte y este espera su respuesta.
  const aviso = new Int32Array(new SharedArrayBuffer(4));
  const { port1: aca, port2: alla } = new MessageChannel();
  const hilo = new Worker(new URL("./base.worker.mjs", import.meta.url), { workerData: { puerto: Number(puerto), base, clave, aviso, mensajes: alla }, transferList: [alla] });
  hilo.unref();
  return (sql) => {
    Atomics.store(aviso, 0, 0);
    aca.postMessage(sql);
    if (Atomics.wait(aviso, 0, 0, 60_000) === "timed-out") throw new Error(`La base no contestó en 60 s: ${sql}`);
    const respuesta = receiveMessageOnPort(aca)?.message as { salida?: string; error?: string } | undefined;
    if (!respuesta) throw new Error(`La base no devolvió nada: ${sql}`);
    if (respuesta.error !== undefined) throw new Error(`${respuesta.error}\n${sql}`);
    return respuesta.salida!;
  };
}
