import { describe, expect, it } from "vitest";
import { pantallaDeCompras } from "./compras";

const con = (...tiene: string[]) => (...pide: string[]) => pide.some((p) => tiene.includes(p));

// Depósito → Compras, en el celular y en la computadora (decisiones 149 y 153).
describe("qué se abre en Compras", () => {
  it("con las compras o los gastos, el escritorio de compras", () => {
    expect(pantallaDeCompras(con("deposito.compras"))).toBe("escritorio");
    expect(pantallaDeCompras(con("negocio.gastos", "deposito.ingresos"))).toBe("escritorio");
  });
  it("quien solo recibe mercadería, el ingreso", () => {
    expect(pantallaDeCompras(con("deposito.ingresos", "deposito.pedidos"))).toBe("ingreso");
  });
  it("021-T012 quien solo encarga compras, los pedidos", () => {
    expect(pantallaDeCompras(con("deposito.pedidos"))).toBe("pedidos");
  });
});
