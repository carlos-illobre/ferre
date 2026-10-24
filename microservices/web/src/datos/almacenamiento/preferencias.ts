import { crearPreferencias } from "../../plataforma/preferencias/preferencias";

// Las preferencias de Ferrebress en este dispositivo (RF-83). El mecanismo es tecnología de la
// plataforma; acá se dice cuáles son:
// - `animaciones`: el movimiento al navegar.
// - `sinConexion`: guardar los datos del negocio para trabajar sin conexión (RF-84); null hasta que
//   la persona la toca: vale lo de arranque de cada aparato (habilitada en la computadora, specs/018).
// - `versionCada` y `versionNunca`: cada cuántos minutos se busca una versión nueva con la
//   aplicación a la vista, y si no se busca (la llave apagada, RF-96, decisión 92). Apagarla no
//   borra el tiempo elegido.
export const TIEMPOS_DE_VERSION = [5, 15, 60, 1440] as const;
export type TiempoDeVersion = (typeof TIEMPOS_DE_VERSION)[number];
export type Preferencias = { animaciones: boolean; sinConexion: boolean | null; versionCada: TiempoDeVersion; versionNunca: boolean };

const propias = crearPreferencias<Preferencias>({
  clave: "ferre.preferencias",
  deArranque: { animaciones: true, sinConexion: null, versionCada: 15, versionNunca: false },
  leer: (guardado, deArranque) => ({
    animaciones: typeof guardado?.animaciones === "boolean" ? guardado.animaciones : deArranque.animaciones,
    sinConexion: typeof guardado?.sinConexion === "boolean" ? guardado.sinConexion : deArranque.sinConexion,
    versionCada: TIEMPOS_DE_VERSION.find((t) => t === guardado?.versionCada) ?? deArranque.versionCada,
    versionNunca: typeof guardado?.versionNunca === "boolean" ? guardado.versionNunca : deArranque.versionNunca,
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
// Si la aplicación busca sola versiones nuevas mientras está abierta (al volver a ella, al volver
// la conexión y con el timer), y cada cuánto lo hace el timer, en milisegundos (RF-96).
export const buscaVersionSola = (p: Preferencias): boolean => !p.versionNunca;
export const cadaCuantoBuscarVersion = (p: Preferencias): number | null => p.versionNunca ? null : p.versionCada * 60_000;
// Para las pruebas: volver a leer lo guardado, como al abrir la aplicación.
export const recargarPreferencias = propias.recargar;
