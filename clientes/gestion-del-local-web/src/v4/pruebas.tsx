// Para las pruebas de las pantallas de la v4: las dibuja como en la app (con los avisos
// flotantes y un usuario en el encabezado), paradas en su dirección.
import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { AvisosFlotantes, cerrarAviso } from "./piezas";
import { ContextoDeUsuario, type UsuarioEnPantalla } from "./usuario";

export const USUARIO_DE_PRUEBA: UsuarioEnPantalla = { nombre: "Carlos", correo: "carlos@ejemplo.com", rol: "Administrador", salir: vi.fn() };

/** `dibujar(<Stock />, "stock")`: la pantalla en `#/stock`, con los avisos de `avisar()` a la vista (`data-testid="mensaje"`). */
export function dibujar(pantalla: ReactElement, camino = "") {
  window.location.hash = `#/${camino}`;
  window.scrollTo = () => undefined; // jsdom no lo trae
  cerrarAviso();
  return render(
    <ContextoDeUsuario.Provider value={USUARIO_DE_PRUEBA}>
      {pantalla}
      <AvisosFlotantes />
    </ContextoDeUsuario.Provider>,
  );
}
