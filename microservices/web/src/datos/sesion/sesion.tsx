import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
// Quien dependa de la sesión para conectarse (el espejo con el celular) se entera al entrar.
export const EVENTO_SESION_ABIERTA = "ferre:sesion-abierta";
// Avisa que la persona ya no está: salió o se le cerró la sesión. Lo que es de ella (la venta a
// medio armar) se borra al enterarse; los datos no saben qué es una venta (ADR-028).
export const EVENTO_SESION_TERMINADA = "ferre:sesion-terminada";
const terminar = () => window.dispatchEvent(new Event(EVENTO_SESION_TERMINADA));
import { api, borrarToken, guardarToken, leerToken } from "../conexion";
import type { SesionActual, UsuarioDeLaSesion } from "@servidor/sesiones";
import { deEsteAmbiente } from "../../plataforma/ambiente";

// `roles` son los nombres de sus roles y `permisos` lo que esos roles le dejan hacer (RF-72).
// `rol` es el dato viejo de un solo rol: ya no viene del servidor; lo leen las versiones históricas.
// Una sesión guardada por una versión anterior puede no traer los roles ni los permisos.
export type Usuario = Omit<UsuarioDeLaSesion, "roles" | "permisos"> & Partial<Pick<UsuarioDeLaSesion, "roles" | "permisos">> & { rol?: "dueño" | "admin" | "mostrador" };
export const administra = (u: Usuario | null | undefined) => u?.rol === "dueño" || u?.rol === "admin" || Boolean(u?.permisos?.includes("admin.usuarios"));
type Estado = { estado: "cargando" } | { estado: "sin-sesion" } | { estado: "con-sesion"; usuario: Usuario; sinConexion: boolean; sesionId: string | null };

const Contexto = createContext<{ sesion: Estado; entrar: (token: string, usuario: Usuario) => void; salir: () => Promise<void> } | null>(null);

// Sin conexión con el servidor, una sesión guardada se da por válida: el empleado no
// puede quedarse sin vender porque se cortó internet. Si al reconectar el servidor
// dice 401, la app vuelve al login sola (ver api.ts).
export function ProveedorDeSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Estado>({ estado: "cargando" });

  useEffect(() => {
    const token = leerToken();
    if (!token) return setSesion({ estado: "sin-sesion" });
    api<SesionActual>("/sesiones/actual")
      .then((r) => { guardarUsuario(r.usuario); setSesion({ estado: "con-sesion", usuario: r.usuario, sinConexion: false, sesionId: r.id }); })
      .catch((e: { estado?: number }) => {
        if (e.estado === 401) return setSesion({ estado: "sin-sesion" });
        const guardado = leerUsuarioGuardado();
        setSesion(guardado ? { estado: "con-sesion", usuario: guardado, sinConexion: true, sesionId: null } : { estado: "sin-sesion" });
      });
    const alCerrar = () => { terminar(); setSesion({ estado: "sin-sesion" }); };
    window.addEventListener("sesion-cerrada", alCerrar);
    return () => window.removeEventListener("sesion-cerrada", alCerrar);
  }, []);

  // La sesión puede cerrarse en el servidor: a distancia, o al desactivar al usuario. Con la
  // aplicación abierta se pregunta cada 30 segundos, al volver a la ventana y al recuperar la
  // conexión; si ya no vale, el 401 la cierra y vuelve sola a la entrada (api.ts). En otra
  // ventana no se pregunta: se pregunta al volver.
  const conSesion = sesion.estado === "con-sesion";
  useEffect(() => {
    if (!conSesion) return;
    // Si la sesión sigue valiendo se pregunta al volver a la aplicación y al volver la conexión,
    // sin timer (decisión 158): una cerrada a distancia también la rechaza el primer pedido.
    const controlar = () => { if (document.visibilityState !== "hidden") api<SesionActual>("/sesiones/actual").catch(() => undefined); };
    document.addEventListener("visibilitychange", controlar);
    window.addEventListener("online", controlar);
    return () => { document.removeEventListener("visibilitychange", controlar); window.removeEventListener("online", controlar); };
  }, [conSesion]);

  const entrar = useCallback((token: string, usuario: Usuario) => {
    guardarToken(token);
    window.dispatchEvent(new Event(EVENTO_SESION_ABIERTA));
    guardarUsuario(usuario);
    setSesion({ estado: "con-sesion", usuario, sinConexion: false, sesionId: null });
    api<SesionActual>("/sesiones/actual").then((r) => { setSesion((s) => (s.estado === "con-sesion" ? { ...s, sesionId: r.id } : s)); }).catch(() => undefined);
  }, []);

  const salir = useCallback(async () => {
    await api("/sesiones/actual", { method: "DELETE" }).catch(() => undefined);
    borrarToken();
    terminar();
    setSesion({ estado: "sin-sesion" });
  }, []);

  return <Contexto.Provider value={{ sesion, entrar, salir }}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion fuera de ProveedorDeSesion");
  return valor;
}

const CLAVE_USUARIO = deEsteAmbiente("ferre.usuario");
function guardarUsuario(u: Usuario) {
  try { localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u)); } catch { /* sin almacenamiento: se pide login al reconectar */ }
}
// Quién usa este dispositivo: el último que entró. La cola de cambios guarda cada uno a su nombre.
export function idDelUsuarioDeEsteDispositivo(): string | null {
  return leerUsuarioGuardado()?.id ?? null;
}
function leerUsuarioGuardado(): Usuario | null {
  try { const v = localStorage.getItem(CLAVE_USUARIO); return v ? (JSON.parse(v) as Usuario) : null; } catch { return null; }
}
