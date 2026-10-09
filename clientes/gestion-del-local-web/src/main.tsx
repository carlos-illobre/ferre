import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { ANCHO_DE_ESCRITORIO, vistaPara } from "./vista";

// La app se guarda en el navegador y abre sin conexión (issue #18). Cuando hay una
// versión nueva, se toma sola en la próxima apertura.
registerSW({ immediate: true });

// Celular o escritorio según el ancho al abrir. Cada interfaz trae sus propios estilos, así
// que si la ventana cruza el límite (girar una tablet, achicar la ventana) se recarga.
// Cada import() va en su propia sentencia a propósito: escritos como dos ramas de un mismo
// ternario, Vite les asigna a los dos la precarga de uno solo y la computadora termina
// cargando los estilos del celular (se ve solo en el build, no en `vite dev`).
async function cargarInterfaz() {
  if (vistaPara(window.innerWidth) === "escritorio") {
    const { App } = await import("./escritorio/App");
    return App;
  }
  const { App } = await import("./App");
  return App;
}
void cargarInterfaz().then((App) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
window.matchMedia(`(min-width: ${ANCHO_DE_ESCRITORIO}px)`).addEventListener("change", () => window.location.reload());
