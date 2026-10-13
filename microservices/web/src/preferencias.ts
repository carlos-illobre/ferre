import { crearPreferencias } from "./plataforma/preferencias/preferencias";

// Las preferencias de Ferrebress en este dispositivo (RF-83). El mecanismo es tecnología de la
// plataforma; acá se dice cuáles son:
// - `animaciones`: el movimiento al navegar.
// - `sinConexion`: en el celular, guardar los datos del negocio para trabajar sin conexión (RF-84).
// - `buscar`: con el guardado deshabilitado, cómo se buscan los productos (RF-85).
export type Preferencias = { animaciones: boolean; sinConexion: boolean; buscar: "memoria" | "servidor" };

const propias = crearPreferencias<Preferencias>({
  clave: "ferre.preferencias",
  deArranque: { animaciones: true, sinConexion: false, buscar: "memoria" },
  leer: (guardado, deArranque) => ({
    animaciones: typeof guardado?.animaciones === "boolean" ? guardado.animaciones : deArranque.animaciones,
    sinConexion: typeof guardado?.sinConexion === "boolean" ? guardado.sinConexion : deArranque.sinConexion,
    buscar: guardado?.buscar === "servidor" ? "servidor" : deArranque.buscar,
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
// Para las pruebas: volver a leer lo guardado, como al abrir la aplicación.
export const recargarPreferencias = propias.recargar;
