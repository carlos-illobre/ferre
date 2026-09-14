import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerSW } from "virtual:pwa-register";

// La app se guarda en el navegador y abre sin conexión (issue #18). Cuando hay una
// versión nueva, se toma sola en la próxima apertura.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
