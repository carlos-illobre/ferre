import type { Context, MiddlewareHandler } from "hono";
import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";
import { pool } from "./db.js";
import { buscarSesion, type SesionActiva, type Usuario } from "./sesiones.js";

// Quién es el que llama. Sin sesión válida, 401; con rol insuficiente, 403.

declare module "hono" {
  interface ContextVariableMap {
    sesion: SesionActiva;
  }
}

export function tokenDe(c: Context): string | null {
  const cabecera = c.req.header("Authorization") ?? "";
  return cabecera.startsWith("Bearer ") ? cabecera.slice(7) : null;
}

export const exigirSesion: MiddlewareHandler = async (c, next) => {
  const token = tokenDe(c);
  const sesion = token ? await buscarSesion(pool, token) : null;
  if (!sesion) return c.json({ error: "Hay que iniciar sesión" }, 401);
  c.set("sesion", sesion);
  await next();
};

export function exigirRol(rol: Usuario["rol"]): MiddlewareHandler {
  return async (c, next) => {
    if (c.get("sesion").usuario.rol !== rol) return c.json({ error: `Solo puede hacerlo el ${rol}` }, 403);
    await next();
  };
}

// Verifica el token que devuelve el botón de Google contra las claves públicas de
// Google. Sin contraseñas: la identidad la afirma Google, nosotros solo decidimos si ese
// correo está autorizado (tabla usuario).
const clienteGoogle = new OAuth2Client(config.googleClientId);

export async function emailVerificadoPorGoogle(credencial: string): Promise<string | null> {
  try {
    const ticket = await clienteGoogle.verifyIdToken({ idToken: credencial, audience: config.googleClientId });
    const datos = ticket.getPayload();
    if (!datos?.email || !datos.email_verified) return null;
    return datos.email.toLowerCase();
  } catch {
    return null;
  }
}

// Límite de intentos por IP para los puntos de entrada sin sesión.
const intentos = new Map<string, { cuenta: number; desde: number }>();
export function limitarIntentos(maximoPorMinuto: number): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida";
    const ahora = Date.now();
    const registro = intentos.get(ip);
    if (!registro || ahora - registro.desde > 60_000) {
      intentos.set(ip, { cuenta: 1, desde: ahora });
    } else if (++registro.cuenta > maximoPorMinuto) {
      return c.json({ error: "Demasiados intentos; esperá un minuto" }, 429);
    }
    await next();
  };
}
