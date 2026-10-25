import { ErrorApi } from "../../datos/conexion";

// Los errores de entrar, dichos para alguien que todavía no conoce el sistema.
export type ErrorDeEntrada = { titulo?: string; texto: string };
type Medio = "google" | "huella";

function deLaHuella(e: Error): ErrorDeEntrada | null {
  return e.name === "NotAllowedError" || e.name === "AbortError" ? { texto: "No se pudo leer la huella. Probá de nuevo o entrá con tu cuenta de Google." } : null;
}

function noAutorizado(e: ErrorApi): ErrorDeEntrada {
  const correo = /\S+@\S+/.exec(e.message)?.[0];
  return { titulo: "No autorizado", texto: `${correo ?? "Ese correo"} no está autorizado para entrar a Ferrebress. Pedile a un Administrador del negocio que lo agregue en Más → Usuarios, o probá con otra cuenta de Google.` };
}

function delServidor(e: ErrorApi, medio: Medio): ErrorDeEntrada {
  if (e.estado === 429) return { texto: "Demasiados intentos; esperá un minuto" };
  if (e.estado === 403) return medio === "google" ? noAutorizado(e) : { titulo: "Usuario desactivado", texto: "Tu usuario está desactivado. Pedile a un Administrador del negocio que lo reactive." };
  if (e.estado === 401) return medio === "huella" ? { texto: "Este dispositivo no está vinculado a ninguna cuenta. Entrá con Google; después lo vinculás desde Más → Configuración." } : { texto: "Google no pudo verificar la cuenta. Probá de nuevo." };
  return { texto: e.message };
}

export function porQueNoEntro(e: unknown, medio: Medio): ErrorDeEntrada {
  const huella = medio === "huella" ? deLaHuella(e as Error) : null;
  if (huella) return huella;
  if (!(e instanceof ErrorApi)) return { titulo: "Sin conexión", texto: "Para entrar se necesita internet. Revisá la conexión y probá de nuevo." };
  return delServidor(e, medio);
}
