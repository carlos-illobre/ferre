import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { preferencias, recargarPreferencias } from "./datos/almacenamiento";
import { Configuracion } from "./pruebas/configuracion";

// Configuración ya no tiene nada sobre la versión nueva: se busca sin timer (decisión 157, RF-96).
describe("Configuración · sin «Buscar versión nueva»", () => {
  beforeEach(() => { localStorage.clear(); recargarPreferencias(); });

  it("009-E19: ni en el celular ni en la computadora hay tiempos ni llave para la versión nueva", () => {
    for (const celular of [true, false]) {
      const { unmount } = render(<Configuracion celular={celular} />);
      expect(screen.queryByTestId("cfg-version")).toBeNull();
      expect(screen.queryByText(/versión nueva/i)).toBeNull();
      expect(screen.queryAllByRole("radio")).toHaveLength(0);
      unmount();
    }
  });

  it("009-E24: lo guardado por la versión anterior (un tiempo, la llave apagada) no cuenta", () => {
    localStorage.setItem("ferre.preferencias", JSON.stringify({ animaciones: false, versionCada: 60, versionNunca: true }));
    recargarPreferencias();
    expect(preferencias()).toEqual({ animaciones: false, sinConexion: null });
  });
});
