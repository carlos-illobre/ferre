import { crearPreferencias } from "../../plataforma/preferencias/preferencias";

// Las preferencias de Ferrebress en este dispositivo (RF-83). El mecanismo es tecnología de la
// plataforma; acá se dice cuáles son:
// - `animaciones`: el movimiento al navegar.
// - `sinConexion`: guardar los datos del negocio para trabajar sin conexión (RF-84); null hasta que
//   la persona la toca: vale lo de arranque de cada aparato (habilitada en la computadora, specs/018).
// Lo que se guardaba de la versión nueva (cada cuánto buscarla) ya no se lee: no hay timer
// (decisión 157).
export type Preferencias = { animaciones: boolean; sinConexion: boolean | null };

const propias = crearPreferencias<Preferencias>({
  clave: "ferre.preferencias",
  deArranque: { animaciones: true, sinConexion: null },
  leer: (guardado, deArranque) => ({
    animaciones: typeof guardado?.animaciones === "boolean" ? guardado.animaciones : deArranque.animaciones,
    sinConexion: typeof guardado?.sinConexion === "boolean" ? guardado.sinConexion : deArranque.sinConexion,
  }),
  // La marca que apaga el movimiento: la miran la hoja de estilos y la navegación animada.
  alAplicar: (actuales) => {
    if (actuales.animaciones) delete document.documentElement.dataset.animaciones;
    else document.documentElement.dataset.animaciones = "no";
  },
});

export const preferencias = propias.leer;
export const cambiarPreferencia = propias.cambiar;
export const usePreferencias = propias.usar;
export const alCambiarPreferencias = propias.escuchar;
// Para las pruebas: volver a leer lo guardado, como al abrir la aplicación.
export const recargarPreferencias = propias.recargar;
