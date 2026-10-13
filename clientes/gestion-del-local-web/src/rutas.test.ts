import { afterEach, describe, expect, it, vi } from "vitest";
import { animarNavegacion, irA, movimientoDe } from "./rutas";

// El movimiento al navegar en el celular (decisión 78).
describe("movimiento de la navegación", () => {
  it("entrar a una pantalla de Más la trae desde la derecha, y volver la saca", () => {
    expect(movimientoDe("#/mas", "#/mas/roles")).toBe("adelante");
    expect(movimientoDe("#/mas/roles", "#/mas")).toBe("atras");
    expect(movimientoDe("#/negocio", "#/mas")).toBe("atras");
  });
  it("cambiar de parte o de pestaña es un fundido", () => {
    expect(movimientoDe("#/catalogo", "#/vender")).toBe("funde");
    expect(movimientoDe("#/deposito/stock", "#/deposito/ingreso")).toBe("funde");
    expect(movimientoDe("#/mas/roles", "#/mas/usuarios")).toBe("funde");
    expect(movimientoDe("", "#/mas")).toBe("funde");
  });
});

// El navegador no corre cuadros de animación mientras espera la pantalla nueva: si la
// navegación esperara uno, quedaría trabada hasta que el navegador se rindiera (pasó el 2026-10-13).
describe("navegación animada", () => {
  afterEach(() => { animarNavegacion(false); delete (document as unknown as { startViewTransition?: unknown }).startViewTransition; vi.restoreAllMocks(); });

  it("avisa que la pantalla nueva está lista con el cambio de dirección, sin esperar ningún cuadro de animación", async () => {
    const cuadro = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 0);
    let lista: Promise<void> | void = undefined;
    (document as unknown as { startViewTransition: unknown }).startViewTransition = (cambio: () => Promise<void> | void) => { lista = cambio(); return { finished: Promise.resolve(lista) }; };
    animarNavegacion(true);
    location.hash = "#/mas";
    await new Promise((r) => setTimeout(r, 0));
    const inicio = performance.now();
    irA("mas/roles");
    await lista;
    expect(location.hash).toBe("#/mas/roles");
    expect(performance.now() - inicio).toBeLessThan(300);
    expect(cuadro).not.toHaveBeenCalled();
  });
});
