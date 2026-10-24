import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mantenerActualizada } from "../pantallas/actualizacion";
import { VersionNueva } from "../pantallas/VersionNueva";
import { esAmbienteDePrueba } from "../plataforma/ambiente";
import { MarcoDePrueba } from "../pantallas/MarcoDePrueba";
// Importarlo aplica al abrir lo que la persona eligió en Configuración (RF-83).
import { respetarElGuardado } from "../datos/almacenamiento";
import { ANCHO_DE_ESCRITORIO, vistaPara } from "./vista";

// Ferrebress tiene dos juegos de pantallas: en el celular, una cosa por vez, con tarjetas y
// hojas; en la computadora, menú lateral, tablas y teclado. Comparten paleta y el menú «Más».
// Se elige por el ancho al abrir; cada una trae solo sus estilos, así que si la ventana
// cruza el límite se recarga. Cada import() va en su propia sentencia a propósito: en un
// mismo ternario Vite les asigna a los dos la precarga de uno solo.
mantenerActualizada();
void respetarElGuardado();

async function cargarInterfaz() {
  if (vistaPara(window.innerWidth) === "escritorio") {
    const { App } = await import("../pantallas/compu/App");
    return App;
  }
  const { App } = await import("../pantallas/celular/App");
  return App;
}
void cargarInterfaz().then((App) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
      {esAmbienteDePrueba() && <MarcoDePrueba />}
      <VersionNueva />
    </StrictMode>,
  );
});
window.matchMedia(`(min-width: ${ANCHO_DE_ESCRITORIO}px)`).addEventListener("change", () => window.location.reload());
