import { useCallback, useEffect, useState } from "react";
import { api } from "../../datos/conexion";
import type { PermisoDelSistema, Rol, RolNuevo } from "@acceso/usuarios";

// Roles (RF-75): cada rol es un nombre y un grupo de permisos. Los permisos son fijos y los trae
// el servidor, cada uno con su explicación. Lo mismo en el celular y en la computadora.
export type { PermisoDelSistema, Rol };
export type RolAsignable = Pick<Rol, "id" | "nombre"> & Partial<Pick<Rol, "descripcion">>;
export type BorradorDeRol = { id: string | null; nombre: string; permisos: Set<string> };

// Los roles que se le pueden dar a una persona, para elegirlos en su ficha o al autorizarla.
export function useRolesAsignables(): RolAsignable[] {
  const [roles, setRoles] = useState<RolAsignable[]>([]);
  useEffect(() => { api<RolAsignable[]>("/roles").then(setRoles).catch(() => undefined); }, []);
  return roles;
}

// El error del servidor ya dice qué pasó; sin conexión, qué es lo que necesita internet.
const mensajeDe = (e: unknown, quehacer: string) => ((e as { estado?: number }).estado ? `${(e as Error).message}.` : `Sin conexión: ${quehacer} necesita internet.`);

// Un rol necesita nombre y al menos un permiso.
export function faltaEnElRol(b: BorradorDeRol): string | null {
  if (!b.nombre.trim()) return "Poné el nombre del rol.";
  return b.permisos.size === 0 ? "Elegí al menos un permiso para el rol." : null;
}

export const quienesLoTienen = (n: number) => (n === 0 ? "Nadie lo tiene" : n === 1 ? "Lo tiene 1 persona" : `Lo tienen ${n} personas`);

// Los roles con sus permisos; guardar uno (nuevo o cambiado) o borrarlo deja un aviso por seis segundos.
export function useRoles() {
  const [roles, setRoles] = useState<Rol[] | null>(null);
  const [permisos, setPermisos] = useState<PermisoDelSistema[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    try {
      const [r, p] = await Promise.all([api<Rol[]>("/roles"), api<PermisoDelSistema[]>("/permisos")]);
      setRoles(r); setPermisos(p); setError(null);
    } catch (e) { setError(mensajeDe(e, "ver los roles")); }
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6000); return () => clearTimeout(t); }, [aviso]);

  // Devuelve el error, o null si se guardó; `listo` corre antes de volver a traer los roles.
  async function guardar(b: BorradorDeRol, listo: () => void): Promise<string | null> {
    const nombre = b.nombre.trim();
    const cuerpo = JSON.stringify({ nombre, permisos: [...b.permisos] } satisfies RolNuevo);
    try {
      if (b.id) await api(`/roles/${b.id}`, { method: "PATCH", body: cuerpo });
      else await api("/roles", { method: "POST", body: cuerpo });
    } catch (e) { return mensajeDe(e, "guardar un rol"); }
    setAviso(b.id ? `Rol «${nombre}» guardado. Vale desde ahora para quienes lo tienen.` : `Rol «${nombre}» creado. Ya se puede asignar en la pestaña Usuarios.`);
    listo();
    await cargar();
    return null;
  }
  async function borrar(r: Rol, listo: () => void) {
    setError(null);
    try { await api(`/roles/${r.id}`, { method: "DELETE" }); }
    catch (e) { setError(mensajeDe(e, "borrar un rol")); return; }
    setAviso(`Rol «${r.nombre}» borrado.`);
    listo();
    await cargar();
  }
  const nombreDe = (clave: string) => permisos.find((p) => p.clave === clave)?.nombre ?? clave;
  return { roles, permisos, partes: [...new Set(permisos.map((p) => p.parte))], error, aviso, cargar, guardar, borrar, nombreDe };
}
export type Roles = ReturnType<typeof useRoles>;
