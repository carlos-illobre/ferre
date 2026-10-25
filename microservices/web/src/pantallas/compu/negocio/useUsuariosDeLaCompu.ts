import { useState } from "react";
import { comoCarga, textoDeError } from "./negocio-comun";
import { accesoDe, avisoDeCelularQuitado, avisoDeSesionCerrada, avisoDelCambio, cambiarUsuario, cerrarSesion, quitarCelularDeOtro, useCelularesDeOtros, useFiltroDeUsuarios, useSesiones, useRolesAsignables, useUsuarioActual, useUsuarios, type CelularDeOtroFila, type SesionFila, type UsuarioFila } from "../../../negocio/usuarios";


export type Mensaje = { texto: string; testId?: string };
export type Avisar = (m: Mensaje) => void;

// Lo que hace Más → Usuarios en la computadora: la lista, la persona elegida (la primera si no se
// eligió ninguna) y los cambios desde su ficha, con su aviso o su error al lado.
export function useUsuariosDeLaCompu(avisar: Avisar) {
  const yo = useUsuarioActual()?.id ?? null;
  const lista = comoCarga(useUsuarios(), "No se pudieron traer los usuarios");
  const filas = lista.datos ?? [];
  const [ocupada, setOcupada] = useState<string | null>(null);
  const [errorDeFila, setErrorDeFila] = useState<{ id: string; texto: string } | null>(null);
  const [alta, setAlta] = useState(false);
  const [elegidaId, setElegidaId] = useState<string | null>(null);
  const [cambiandoRoles, setCambiandoRoles] = useState(0);
  const disponibles = useRolesAsignables();
  const filtro = useFiltroDeUsuarios(filas);
  // Sus sesiones y sus celulares con huella (decisión 100), en la ficha de cada persona.
  const sesiones = useSesiones();
  const celulares = useCelularesDeOtros();
  const visibles = filtro.visibles;
  const elegida = visibles.find((u) => u.id === elegidaId) ?? visibles[0] ?? null;

  async function cambiar(u: UsuarioFila, cambios: { roles?: string[]; activo?: boolean }): Promise<string | null> {
    setOcupada(u.id); setErrorDeFila(null);
    try {
      await cambiarUsuario(u.id, cambios);
      const texto = avisoDelCambio(u.nombre, cambios);
      if (texto) avisar({ texto });
      return null;
    } catch (e) {
      const texto = textoDeError(e, "No se pudo guardar el cambio");
      if (!cambios.roles) setErrorDeFila({ id: u.id, texto });
      return texto;
    } finally { setOcupada(null); }
  }
  const { cerrarLaSesion, quitarElCelular } = useAccesoDeOtros(avisar, setErrorDeFila, sesiones.recargar, celulares.recargar);
  const accesoDeLaFila = (u: UsuarioFila) => accesoDe(u.id, sesiones.datos, celulares.datos);
  const errorDe = (u: UsuarioFila) => (errorDeFila?.id === u.id ? errorDeFila.texto : null);

  return {
    yo, lista, filas, disponibles, filtro, visibles, elegida, sesiones, celulares, ocupada, alta, cambiandoRoles,
    elegir: setElegidaId, setAlta, pedirCambioDeRoles: () => setCambiandoRoles((n) => n + 1),
    cambiar, cerrarLaSesion, quitarElCelular, accesoDeLaFila, errorDe,
  };
}
export type UsuariosDeLaCompu = ReturnType<typeof useUsuariosDeLaCompu>;

// Cerrarle una sesión o quitarle un celular con huella a otra persona, desde su ficha.
function useAccesoDeOtros(avisar: Avisar, setErrorDeFila: (e: { id: string; texto: string } | null) => void, recargarSesiones: () => void, recargarCelulares: () => void) {
  async function cerrarLaSesion(u: UsuarioFila, s: SesionFila) {
    setErrorDeFila(null);
    try { await cerrarSesion(s.id); avisar({ texto: avisoDeSesionCerrada(u.nombre, s.dispositivo) }); }
    catch (e) { setErrorDeFila({ id: u.id, texto: textoDeError(e, `No se pudo cerrar la sesión de ${u.nombre}`) }); recargarSesiones(); }
  }
  async function quitarElCelular(u: UsuarioFila, c: CelularDeOtroFila) {
    setErrorDeFila(null);
    try { await quitarCelularDeOtro(c.id); avisar({ texto: avisoDeCelularQuitado(u.nombre, c.dispositivo), testId: "mensaje-celular" }); }
    catch (e) { setErrorDeFila({ id: u.id, texto: textoDeError(e, `No se pudo quitar el celular de ${u.nombre}`) }); recargarCelulares(); }
  }
  return { cerrarLaSesion, quitarElCelular };
}
