import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { buscaVersionSola, cadaCuantoBuscarVersion, cambiarPreferencia, preferencias, recargarPreferencias } from "./preferencias";
import { Configuracion } from "./pantallas/Configuracion";

// Cada cuánto se busca una versión nueva con la aplicación a la vista (RF-96, decisión 92).
// Que el timer se pare con la app oculta y tome el tiempo nuevo lo prueba mientras-se-ve.test.ts.
const elegido = () => screen.getAllByRole("radio").filter((b) => b.getAttribute("aria-checked") === "true").map((b) => b.textContent);

describe("Configuración · buscar versión nueva", () => {
  beforeEach(() => { localStorage.clear(); recargarPreferencias(); });

  it("009-E19: sin nada guardado, cuatro botones con 15 min elegido y la llave prendida, en el celular y en la computadora", () => {
    for (const celular of [true, false]) {
      const { unmount } = render(<Configuracion celular={celular} />);
      expect(["5", "15", "60", "1440"].map((t) => screen.getByTestId(`cfg-version-${t}`).textContent)).toEqual(["5 min", "15 min", "1 hora", "24 horas"]);
      expect(elegido()).toEqual(["15 min"]);
      expect(screen.getByTestId("cfg-version-llave").getAttribute("aria-checked")).toBe("true");
      unmount();
    }
    expect(cadaCuantoBuscarVersion(preferencias())).toBe(15 * 60_000);
  });

  it("009-E20: elegir otro botón vale desde ese momento", () => {
    render(<Configuracion celular />);
    fireEvent.click(screen.getByTestId("cfg-version-60"));
    expect(elegido()).toEqual(["1 hora"]);
    expect(cadaCuantoBuscarVersion(preferencias())).toBe(60 * 60_000);
    fireEvent.click(screen.getByTestId("cfg-version-5"));
    expect(cadaCuantoBuscarVersion(preferencias())).toBe(5 * 60_000);
  });

  it("009-E21: con la llave apagada no busca (ni timer, ni al volver, ni al volver la conexión) y los botones no se muestran", () => {
    render(<Configuracion />);
    expect(buscaVersionSola(preferencias())).toBe(true);
    fireEvent.click(screen.getByTestId("cfg-version-1440"));
    fireEvent.click(screen.getByTestId("cfg-version-llave"));
    expect(cadaCuantoBuscarVersion(preferencias())).toBeNull();
    expect(buscaVersionSola(preferencias())).toBe(false);
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.getByTestId("cfg-version-llave").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("cfg-version").textContent).toContain("al cerrarla y volver a abrirla");
  });

  it("009-E22: al prender la llave, vuelve el tiempo que estaba elegido", () => {
    cambiarPreferencia("versionCada", 60);
    cambiarPreferencia("versionNunca", true);
    render(<Configuracion celular />);
    fireEvent.click(screen.getByTestId("cfg-version-llave"));
    expect(cadaCuantoBuscarVersion(preferencias())).toBe(60 * 60_000);
    expect(elegido()).toEqual(["1 hora"]);
  });

  it("009-E23: lo elegido queda en el dispositivo al volver a abrir o al salir y entrar", () => {
    cambiarPreferencia("versionCada", 5);
    cambiarPreferencia("versionNunca", true);
    localStorage.removeItem("ferre.sesion");
    recargarPreferencias();
    expect(preferencias().versionCada).toBe(5);
    expect(preferencias().versionNunca).toBe(true);
  });

  it("009-E24: un valor guardado que no es ninguno de los cuatro vale 15 min", () => {
    localStorage.setItem("ferre.preferencias", JSON.stringify({ versionCada: 30, versionNunca: "sí" }));
    recargarPreferencias();
    expect(preferencias().versionCada).toBe(15);
    expect(preferencias().versionNunca).toBe(false);
  });
});
