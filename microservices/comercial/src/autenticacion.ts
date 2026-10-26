import { AsyncLocalStorage } from "node:async_hooks";
import { timingSafeEqual } from "node:crypto";
import type { MiddlewareHandler } from "hono";
import { config } from "./config.js";
import { nombreDePermiso, type Permiso } from "./permisos.js";

// Quién es el que llama (specs/029). Lo dice Acceso: la puerta le pregunta en cada pedido y le pasa
// a Comercial quién es y qué puede (X-Usuario-Id, X-Usuario-Nombre, X-Permisos), con el token entre
// servicios. Comercial no guarda personas ni sesiones. Sin persona, 401; sin el permiso que pide la
// operación, 403.
export type Usuario = { id: string; nombre: string; permisos: string[] };
export type SesionActiva = { usuario: Usuario };

declare module "hono" {
  interface ContextVariableMap {
    sesion: SesionActiva;
  }
}

// Solo atiende a la puerta y a los otros servicios (026, RNF-72): todo pedido trae el token entre
// servicios, que la puerta agrega y el navegador no conoce.
// Se comparan los bytes: un token con letras que no son ASCII tiene otro largo en bytes que en letras.
const igual = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };
export const exigirTokenDeServicio: MiddlewareHandler = async (c, next) => {
  if (!igual(c.req.header("X-Token-Servicio") ?? "", config.tokenServicio)) return c.json({ error: "Este servicio solo atiende pedidos que pasan por la puerta" }, 401);
  await next();
};

// Quién hace el pedido, durante todo el pedido: los eventos de auditoría y lo que guarda el nombre
// del momento lo toman de acá, sin preguntarle a nadie (029-E10).
const identidad = new AsyncLocalStorage<Usuario>();
export const quienPide = (): Usuario | undefined => identidad.getStore();
/** Corre algo como esa persona (lo usa exigir la sesión; y las pruebas). */
export const comoPersona = <T>(usuario: Usuario, hacer: () => T): T => identidad.run(usuario, hacer);
/** El nombre de esa persona, si es quien hace el pedido. */
export const nombreDe = (id: string | null | undefined): string | null => {
  const u = quienPide();
  return u && id && u.id === id ? u.nombre : null;
};

function leerPersona(c: Parameters<MiddlewareHandler>[0]): Usuario | null {
  const id = c.req.header("X-Usuario-Id")?.trim();
  if (!id) return null;
  try {
    const nombre = decodeURIComponent(c.req.header("X-Usuario-Nombre") ?? "") || id;
    const permisos = (c.req.header("X-Permisos") ?? "").split(",").map((p) => p.trim()).filter(Boolean);
    return { id, nombre, permisos };
  } catch {
    return null;
  }
}

export const exigirSesion: MiddlewareHandler = async (c, next) => {
  const usuario = leerPersona(c);
  if (!usuario) return c.json({ error: "Hay que iniciar sesión" }, 401);
  c.set("sesion", { usuario });
  await comoPersona(usuario, next);
};

// Pasa quien tenga alguno de los permisos pedidos (ADR-017). Si no, 403 diciendo cuál falta.
export function exigirPermiso(...claves: Permiso[]): MiddlewareHandler {
  return async (c, next) => {
    if (!puede(c.get("sesion").usuario, ...claves)) return c.json({ error: `No tenés permiso para esto. Hace falta: ${claves.map(nombreDePermiso).join(" o ")}`, permiso: claves[0] }, 403);
    await next();
  };
}
export const puede = (usuario: Usuario, ...claves: Permiso[]) => claves.some((p) => usuario.permisos.includes(p));
