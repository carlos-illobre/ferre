import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";

// Ferrebress v2: la interfaz nueva, publicada en /v2/ al lado de la actual para revisarla.
// Usa la misma API, la misma sesión y los mismos datos guardados en el dispositivo.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
