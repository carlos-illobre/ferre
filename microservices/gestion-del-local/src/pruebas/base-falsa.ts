import type { Hono } from "hono";
import { vi } from "vitest";
import type { Usuario } from "../sesiones.js";
import { PERMISOS } from "../permisos.js";

// Base de datos simulada para probar las rutas sin Postgres: cada consulta se anota y se
// contesta con lo que la prueba programó (por expresión regular sobre el SQL). Lo que no
// se programó devuelve cero filas. La sesión del que llama se contesta acá también.
export type Consulta = { sql: string; params: unknown[] };
export type Respuesta = { rows?: Record<string, unknown>[]; rowCount?: number } | ((params: unknown[]) => { rows?: Record<string, unknown>[]; rowCount?: number });

// Usuarios de prueba. «dueño» y «admin» pueden todo; «mostrador» todo menos administrar; y
// «soloVende» nada más que vender, para probar que una ruta rechaza a quien no tiene su permiso.
const TODOS = PERMISOS.map((p) => p.clave as string);
const SIN_ADMINISTRAR = TODOS.filter((p) => !p.startsWith("admin.") && p !== "negocio.actividad");
export const usuarios: Record<string, Usuario & { rol: string }> = {
  dueño: { id: "u-dueño", email: "dueno@ferre.test", nombre: "Dueño", rol: "dueño", roles: ["Todos"], permisos: TODOS },
  admin: { id: "u-admin", email: "admin@ferre.test", nombre: "Admin", rol: "admin", roles: ["Todos"], permisos: TODOS },
  mostrador: { id: "u-mostrador", email: "mostrador@ferre.test", nombre: "Mostrador", rol: "mostrador", roles: ["Operación"], permisos: SIN_ADMINISTRAR },
  soloVende: { id: "u-solo-vende", email: "vende@ferre.test", nombre: "Solo vende", rol: "soloVende", roles: ["Vendedor"], permisos: ["ventas.registrar"] },
};

export function baseFalsa() {
  const consultas: Consulta[] = [];
  const programadas: { patron: RegExp; respuesta: Respuesta }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    consultas.push({ sql, params });
    if (/FROM sesion s JOIN usuario u/.test(sql)) {
      const token = String(params[0]);
      const rol = Object.keys(usuarios).find((r) => token === hashDe(`token-${r}`));
      const u = rol ? usuarios[rol]! : null;
      return { rows: u ? [{ id: `sesion-${u.rol}`, ultimo_uso_en: new Date(), usuario_id: u.id, email: u.email, nombre: u.nombre, roles: u.roles, permisos: u.permisos }] : [], rowCount: u ? 1 : 0 };
    }
    for (const p of programadas) {
      if (p.patron.test(sql)) {
        const r = typeof p.respuesta === "function" ? p.respuesta(params) : p.respuesta;
        return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
      }
    }
    return { rows: [], rowCount: 0 };
  });
  const cliente = { query, release: vi.fn() };
  const pool = { query, connect: vi.fn(async () => cliente) };
  return {
    pool, consultas,
    programar: (patron: RegExp, respuesta: Respuesta) => { programadas.unshift({ patron, respuesta }); },
    sqlDe: (patron: RegExp) => consultas.filter((c) => patron.test(c.sql)),
    limpiar: () => { consultas.length = 0; programadas.length = 0; },
  };
}

import { createHash } from "node:crypto";
const hashDe = (token: string) => createHash("sha256").update(token).digest("hex");

// Pedido a la app con la sesión del rol indicado (o sin sesión).
export function pedir(app: Hono, metodo: string, ruta: string, opciones: { rol?: keyof typeof usuarios | null; cuerpo?: unknown; formulario?: FormData } = {}) {
  const cabeceras = new Headers();
  if (opciones.rol !== null) cabeceras.set("Authorization", `Bearer token-${opciones.rol ?? "dueño"}`);
  let body: BodyInit | undefined;
  if (opciones.formulario) body = opciones.formulario;
  else if (opciones.cuerpo !== undefined) { body = JSON.stringify(opciones.cuerpo); cabeceras.set("Content-Type", "application/json"); }
  return app.request(new Request(`http://api.prueba${ruta}`, { method: metodo, headers: cabeceras, body }));
}
