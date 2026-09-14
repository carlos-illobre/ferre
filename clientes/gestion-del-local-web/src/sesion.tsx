import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, borrarToken, guardarToken, leerToken } from "./api";

export type Usuario = { id: string; email: string; nombre: string; rol: "dueño" | "admin" | "mostrador" };
export const administra = (u: Usuario | null | undefined) => u?.rol === "dueño" || u?.rol === "admin";
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
    api<{ id: string; usuario: Usuario }>("/sesiones/actual")
      .then((r) => { guardarUsuario(r.usuario); setSesion({ estado: "con-sesion", usuario: r.usuario, sinConexion: false, sesionId: r.id }); })
      .catch((e: { estado?: number }) => {
        if (e.estado === 401) return setSesion({ estado: "sin-sesion" });
        const guardado = leerUsuarioGuardado();
        setSesion(guardado ? { estado: "con-sesion", usuario: guardado, sinConexion: true, sesionId: null } : { estado: "sin-sesion" });
      });
    const alCerrar = () => setSesion({ estado: "sin-sesion" });
    window.addEventListener("sesion-cerrada", alCerrar);
    return () => window.removeEventListener("sesion-cerrada", alCerrar);
  }, []);

  const entrar = useCallback((token: string, usuario: Usuario) => {
    guardarToken(token);
    guardarUsuario(usuario);
    setSesion({ estado: "con-sesion", usuario, sinConexion: false, sesionId: null });
    api<{ id: string }>("/sesiones/actual").then((r) => setSesion((s) => (s.estado === "con-sesion" ? { ...s, sesionId: r.id } : s))).catch(() => undefined);
  }, []);

  const salir = useCallback(async () => {
    await api("/sesiones/actual", { method: "DELETE" }).catch(() => undefined);
    borrarToken();
    setSesion({ estado: "sin-sesion" });
  }, []);

  return <Contexto.Provider value={{ sesion, entrar, salir }}>{children}</Contexto.Provider>;
}

export function useSesion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useSesion fuera de ProveedorDeSesion");
  return valor;
}

const CLAVE_USUARIO = "ferre.usuario";
function guardarUsuario(u: Usuario) {
  try { localStorage.setItem(CLAVE_USUARIO, JSON.stringify(u)); } catch { /* sin almacenamiento: se pide login al reconectar */ }
}
function leerUsuarioGuardado(): Usuario | null {
  try { const v = localStorage.getItem(CLAVE_USUARIO); return v ? (JSON.parse(v) as Usuario) : null; } catch { return null; }
}
