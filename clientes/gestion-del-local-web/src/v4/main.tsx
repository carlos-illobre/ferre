import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./estilos/tokens.css";
import "./estilos/base.css";
import { App } from "./App";

// Ferrebress v4: la interfaz aprobada, publicada en /v4/. Usa la misma API, la misma sesión y
// los mismos datos guardados en el dispositivo que las versiones anteriores.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
