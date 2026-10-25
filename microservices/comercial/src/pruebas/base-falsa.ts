import type { Hono } from "hono";
import { vi } from "vitest";
import { olvidarSesiones, type Usuario } from "../acceso/sesiones.js";
import { PERMISOS } from "../permisos.js";

// 022-E14: las rutas y las reglas se prueban como antes de separar la capa de datos: solo cambió
// de dónde se simula la base (el pool de `persistencia/`). Base de datos simulada para probar las
// rutas sin Postgres: cada consulta se anota y se
// contesta con lo que la prueba programó (por expresión regular sobre el SQL). Lo que no
// se programó devuelve cero filas. La sesión del que llama se contesta acá también.
export type Consulta = { sql: string; params: unknown[] };
export type Respuesta = { rows?: Record<string, unknown>[]; rowCount?: number } | ((params: unknown[]) => { rows?: Record<string, unknown>[]; rowCount?: number });

// Usuarios de prueba. «dueño» y «admin» pueden todo; «mostrador» todo menos administrar; y
// «recepcion» lo de quien recibe mercadería; y «soloVende» nada más que vender, para probar que una ruta rechaza a quien no tiene su permiso.
const TODOS = PERMISOS.map((p) => p.clave as string);
const SIN_ADMINISTRAR = TODOS.filter((p) => !p.startsWith("admin.") && p !== "negocio.actividad");
export const usuarios: Record<string, Usuario & { rol: string }> = {
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
  // Cada base de mentira empieza como un servidor recién arrancado: sin sesiones recordadas.
  olvidarSesiones();
  const consultas: Consulta[] = [];
  // De arranque hay alguien que administra el sistema (specs/020); una prueba lo cambia programándolo.
  const programadas: { patron: RegExp; respuesta: Respuesta }[] = [{ patron: /AS n FROM usuario u\s+JOIN usuario_rol/, respuesta: { rows: [{ n: 1 }] } }];
  // Una fila de sesión fija para cualquier token (para probar el vencimiento y la renovación), o
  // null para no encontrar ninguna; sin fijar, la del usuario de prueba de cada token.
  let sesionFija: Record<string, unknown> | null | undefined;
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql, params });
    if (sesionFija !== undefined && /FROM sesion s JOIN usuario u/.test(sql)) return { rows: sesionFija ? [sesionFija] : [], rowCount: sesionFija ? 1 : 0 };
    if (/FROM sesion s JOIN usuario u/.test(sql)) {
      const token = String(params[0]);
      const rol = Object.keys(usuarios).find((r) => token === hashDe(`token-${r}`));
      const u = rol ? usuarios[rol]! : null;
      return { rows: u ? [{ id: `sesion-${u.rol}`, ultimo_uso_en: new Date(), expira_en: new Date(Date.now() + 86_400_000), usuario_id: u.id, email: u.email, nombre: u.nombre, roles: u.roles, permisos: u.permisos }] : [], rowCount: u ? 1 : 0 };
    }
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
    fijarSesion: (fila: Record<string, unknown> | null) => { sesionFija = fila; },
    sqlDe: (patron: RegExp) => consultas.filter((c) => patron.test(c.sql)),
    limpiar: () => { consultas.length = 0; programadas.length = 0; },
  };
}

import { createHash } from "node:crypto";
const hashDe = (token: string) => createHash("sha256").update(token).digest("hex");

// Pedido a la app con la sesión del rol indicado (o sin sesión).
export function pedir(app: Hono, metodo: string, ruta: string, opciones: { rol?: keyof typeof usuarios | null; cuerpo?: unknown; formulario?: FormData; cabeceras?: Record<string, string> } = {}) {
  const cabeceras = new Headers(opciones.cabeceras);
  cabeceras.set("X-Token-Servicio", process.env.TOKEN_SERVICIO!); // como lo manda la puerta (026)
  if (opciones.rol !== null) cabeceras.set("Authorization", `Bearer token-${opciones.rol ?? "dueño"}`);
  let body: BodyInit | undefined;
  if (opciones.formulario) body = opciones.formulario;
  else if (opciones.cuerpo !== undefined) { body = JSON.stringify(opciones.cuerpo); cabeceras.set("Content-Type", "application/json"); }
  return app.request(new Request(`http://api.prueba${ruta}`, { method: metodo, headers: cabeceras, body }));
}
