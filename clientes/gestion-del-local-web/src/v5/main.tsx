import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";

// Ferrebress v5 junta lo que mejor funcionó de cada versión: en el celular, las pantallas de
// la versión 1 (una cosa por vez, tarjetas, hojas); en la computadora, las de la versión 2
// (menú lateral, tablas, teclado). Comparten paleta, el menú «Más» y la venta con sugeridos.
// Se elige por el ancho al abrir; cada una trae solo sus estilos, así que si la ventana
// cruza el límite se recarga. Cada import() va en su propia sentencia a propósito: en un
// mismo ternario Vite les asigna a los dos la precarga de uno solo.
registerSW({ immediate: true });
const ANCHO_DE_COMPUTADORA = 900;

async function cargarInterfaz() {
  if (window.innerWidth >= ANCHO_DE_COMPUTADORA) {
    const { App } = await import("./compu/App");
    return App;
  }
  const { App } = await import("./celular/App");
  return App;
}
void cargarInterfaz().then((App) => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
window.matchMedia(`(min-width: ${ANCHO_DE_COMPUTADORA}px)`).addEventListener("change", () => window.location.reload());
