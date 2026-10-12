import type { Context, MiddlewareHandler } from "hono";
import { OAuth2Client } from "google-auth-library";
import { config } from "./config.js";
import { pool } from "./db.js";
import { buscarSesion, type SesionActiva, type Usuario } from "./sesiones.js";
import { nombreDePermiso, type Permiso } from "./permisos.js";

// Quién es el que llama. Sin sesión válida, 401; sin el permiso que pide la operación, 403.

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

// Pasa quien tenga alguno de los permisos pedidos (ADR-017). Si no, 403 diciendo cuál falta:
// no es un problema de sesión, así que no se le cierra.
export function exigirPermiso(...claves: Permiso[]): MiddlewareHandler {
  return async (c, next) => {
    if (!puede(c.get("sesion").usuario, ...claves)) return c.json({ error: `No tenés permiso para esto. Hace falta: ${claves.map(nombreDePermiso).join(" o ")}`, permiso: claves[0] }, 403);
    await next();
  };
}
export const puede = (usuario: Usuario, ...claves: Permiso[]) => claves.some((p) => usuario.permisos.includes(p));

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

// Límite de intentos por IP para los puntos de entrada sin sesión. Cada `grupo` lleva su
// cuenta: la computadora que espera en la entrada consulta su código cada dos segundos, y eso
// no puede gastar los intentos de entrar con Google o con la huella.
const intentos = new Map<string, { cuenta: number; desde: number }>();
export function limitarIntentos(maximoPorMinuto: number, grupo = "entrada"): MiddlewareHandler {
  return async (c, next) => {
    const ip = `${grupo}|${c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocida"}`;
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
