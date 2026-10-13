import { describe, expect, it } from "vitest";
import { movimientoDe } from "./rutas";

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
