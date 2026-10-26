import type { Hono } from "hono";
import { vi } from "vitest";
import type { Usuario } from "../autenticacion.js";
import { PERMISOS } from "../permisos.js";

// 022-E14: las rutas y las reglas se prueban como antes de separar la capa de datos: solo cambió
// de dónde se simula la base (el pool de `persistencia/`). Base de datos simulada para probar las
// rutas sin Postgres: cada consulta se anota y se
// contesta con lo que la prueba programó (por expresión regular sobre el SQL). Lo que no
// se programó devuelve cero filas. Quién llama lo dice la puerta en sus cabeceras (specs/029).
export type Consulta = { sql: string; params: unknown[] };
export type EventoAnotado = { tipo: string; titulo: string; detalle: string | null; grupo: string; importancia: string; quien: { id: string; nombre: string } | null; dispositivo: string | null; contenido: Record<string, unknown> };
export type Respuesta = { rows?: Record<string, unknown>[]; rowCount?: number } | ((params: unknown[]) => { rows?: Record<string, unknown>[]; rowCount?: number });

// Usuarios de prueba. «dueño» y «admin» pueden todo; «mostrador» todo menos administrar; y
// «recepcion» lo de quien recibe mercadería; y «soloVende» nada más que vender, para probar que una ruta rechaza a quien no tiene su permiso.
const TODOS = PERMISOS.map((p) => p.clave as string);
const SIN_ADMINISTRAR = TODOS.filter((p) => !p.startsWith("admin.") && p !== "negocio.actividad");
export const usuarios: Record<string, Usuario & { rol: string; email: string; roles: string[] }> = {
  dueño: { id: "u-dueño", email: "dueno@ferre.test", nombre: "Dueño", rol: "dueño", roles: ["Todos"], permisos: TODOS },
  admin: { id: "u-admin", email: "admin@ferre.test", nombre: "Admin", rol: "admin", roles: ["Todos"], permisos: TODOS },
  mostrador: { id: "u-mostrador", email: "mostrador@ferre.test", nombre: "Mostrador", rol: "mostrador", roles: ["Operación"], permisos: SIN_ADMINISTRAR },
  recepcion: { id: "u-recepcion", email: "recepcion@ferre.test", nombre: "Recepción", rol: "recepcion", roles: ["Recepción"], permisos: ["deposito.ingresos", "deposito.compras", "deposito.stock"] },
  cajero: { id: "u-cajero", email: "cajero@ferre.test", nombre: "Cajero", rol: "cajero", roles: ["Vendedor"], permisos: ["ventas.registrar", "ventas.ver", "ventas.anular"] },
  soloVende: { id: "u-solo-vende", email: "vende@ferre.test", nombre: "Solo vende", rol: "soloVende", roles: ["Vendedor"], permisos: ["ventas.registrar"] },
  miraProcesos: { id: "u-mira", email: "mira@ferre.test", nombre: "Núñez Mira", rol: "miraProcesos", roles: ["Lector"], permisos: ["procesos.ver"] },
  dibujaProcesos: { id: "u-dibuja", email: "dibuja@ferre.test", nombre: "Dibuja", rol: "dibujaProcesos", roles: ["Dibujante"], permisos: ["procesos.dibujar"] },
  // Cada uno ve una sola sección de «Cómo va el negocio» (decisión 95).
  veVentas: { id: "u-ve-ventas", email: "ventas@ferre.test", nombre: "Ve ventas", rol: "veVentas", roles: ["Ventas"], permisos: ["negocio.ventas"] },
  veGastos: { id: "u-ve-gastos", email: "gastos@ferre.test", nombre: "Ve gastos", rol: "veGastos", roles: ["Gastos"], permisos: ["negocio.gastos"] },
  veInvertido: { id: "u-ve-invertido", email: "invertido@ferre.test", nombre: "Ve invertido", rol: "veInvertido", roles: ["Inventario"], permisos: ["negocio.invertido"] },
};

// Como Postgres, cada respuesta dice qué comando fue (INSERT, UPDATE…): las consultas con tipos lo usan para contar filas.
const comando = (sql: string) => sql.trim().split(/\s/)[0]!.toUpperCase();

export function baseFalsa() {
  const consultas: Consulta[] = [];
  const programadas: { patron: RegExp; respuesta: Respuesta }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql, params });
    for (const p of programadas) {
      if (p.patron.test(sql)) {
        const r = typeof p.respuesta === "function" ? p.respuesta(params) : p.respuesta;
        return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0), command: comando(sql) };
      }
    }
    return { rows: [], rowCount: 0, command: comando(sql) };
  });
  const cliente = { query, release: vi.fn() };
  const pool = { query, connect: vi.fn(async () => cliente) };
  return {
    pool, consultas,
    programar: (patron: RegExp, respuesta: Respuesta) => { programadas.unshift({ patron, respuesta }); },
    sqlDe: (patron: RegExp) => consultas.filter((c) => patron.test(c.sql)),
    // Los eventos que quedaron en la bandeja de auditoría (specs/027), como se van a mandar.
    eventos: () => consultas.filter((c) => /INSERT INTO auditoria_bandeja/.test(c.sql)).map((c) => JSON.parse(String(c.params[1])) as EventoAnotado),
    limpiar: () => { consultas.length = 0; programadas.length = 0; },
  };
}

// Pedido a la app con la sesión del rol indicado (o sin sesión).
export function pedir(app: Hono, metodo: string, ruta: string, opciones: { rol?: keyof typeof usuarios | null; cuerpo?: unknown; formulario?: FormData; cabeceras?: Record<string, string> } = {}) {
  const cabeceras = new Headers(opciones.cabeceras);
  cabeceras.set("X-Token-Servicio", process.env.TOKEN_SERVICIO!); // como lo manda la puerta (026)
  // Quién es y qué puede, como lo pone la puerta después de preguntarle a Acceso (specs/029).
  if (opciones.rol !== null) {
    const u = usuarios[opciones.rol ?? "dueño"]!;
    cabeceras.set("X-Usuario-Id", u.id);
    cabeceras.set("X-Usuario-Nombre", encodeURIComponent(u.nombre));
    cabeceras.set("X-Permisos", u.permisos.join(","));
  }
  let body: BodyInit | undefined;
  if (opciones.formulario) body = opciones.formulario;
  else if (opciones.cuerpo !== undefined) { body = JSON.stringify(opciones.cuerpo); cabeceras.set("Content-Type", "application/json"); }
  return app.request(new Request(`http://api.prueba${ruta}`, { method: metodo, headers: cabeceras, body }));
}
