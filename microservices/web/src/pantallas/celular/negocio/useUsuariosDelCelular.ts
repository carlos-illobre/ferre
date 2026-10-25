import { useState } from "react";
import { accesoDe, cambiarUsuario, cerrarSesion, quitarCelularDeOtro, useCelularesDeOtros, useFiltroDeUsuarios, useSesiones, useRolesAsignables, useUsuarioActual, useUsuarios, type CelularDeOtroFila, type SesionFila, type UsuarioFila } from "../../../negocio/usuarios";


// Lo que hace Más → Usuarios en el celular: la lista con su filtro, el error de arriba (el de traer
// la lista se puede cerrar) y los cambios desde la tarjeta de cada persona, que piden confirmación.
export function useUsuariosDelCelular() {
  const yo = useUsuarioActual()?.id ?? null;
  const disponibles = useRolesAsignables();
  const usuarios = useUsuarios();
  const filas = usuarios.datos ?? [];
  const [aviso, setError] = useState<string | null>(null);
  const [cerrado, setCerrado] = useState<unknown>(null);
  const error = aviso ?? (usuarios.error && usuarios.error !== cerrado ? (usuarios.error as Error).message : null);
  const [alta, setAlta] = useState(false);
  const [rolesDelNuevo, setRolesDelNuevo] = useState<string[]>([]);
  const filtro = useFiltroDeUsuarios(filas);
  const sesiones = useSesiones();
  const celulares = useCelularesDeOtros();
  async function cerrarLaSesion(s: SesionFila) {
    if (!window.confirm(`¿Cerrar la sesión de ${s.nombre} en ${s.dispositivo}? Ese dispositivo vuelve a la entrada.`)) return;
    try { await cerrarSesion(s.id); } catch (err) { setError(`No se pudo cerrar: ${(err as Error).message}`); sesiones.recargar(); }
  }
  async function quitarElCelular(c: CelularDeOtroFila) {
    if (!window.confirm(`¿Quitar "${c.dispositivo ?? "ese celular"}"? Ya no va a poder entrar con la huella.`)) return;
    try { await quitarCelularDeOtro(c.id); } catch (err) { setError(`No se pudo quitar: ${(err as Error).message}`); celulares.recargar(); }
  }
  async function cambiar(id: string, cambios: { activo?: boolean; roles?: string[] }): Promise<string | null> {
    try { await cambiarUsuario(id, cambios); setError(null); return null; }
    catch (err) { return (err as Error).message; }
  }
  const accesoDeLaTarjeta = (u: UsuarioFila) => ({ ...accesoDe(u.id, sesiones.datos, celulares.datos), alCerrarSesion: (s: SesionFila) => void cerrarLaSesion(s), alQuitarCelular: (c: CelularDeOtroFila) => void quitarElCelular(c) });
  return {
    yo, disponibles, filas, filtro, error, setError, alta, setAlta, rolesDelNuevo, setRolesDelNuevo, cambiar, accesoDeLaTarjeta,
    cerrarError: () => { setError(null); setCerrado(usuarios.error); },
    activar: async (u: UsuarioFila) => { const falla = await cambiar(u.id, { activo: !u.activo }); if (falla) setError(falla); },
  };
}
export type EstadoDeUsuarios = ReturnType<typeof useUsuariosDelCelular>;
