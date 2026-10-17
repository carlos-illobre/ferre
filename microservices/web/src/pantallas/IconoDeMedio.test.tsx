import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { IconoDeMedio } from "./IconoDeMedio";

// Decisión 108, specs/017: cada medio de pago tiene su color, uno solo, en la paleta compartida.
describe("el ícono de un medio de pago", () => {
  it("017-E06: lleva la clase de su medio, que toma el color de la paleta compartida", () => {
    const { container } = render(<IconoDeMedio medio="tarjeta" conFondo />);
    expect(container.querySelector(".medio-icono.medio-tarjeta.con-fondo svg")).not.toBeNull();
    const paleta = readFileSync(`${process.cwd()}/src/pantallas/paleta.css`, "utf8");
    const medios = readFileSync(`${process.cwd()}/src/pantallas/medios.css`, "utf8");
    for (const [clase, token] of [["efectivo", "efectivo"], ["mercado_pago", "mp"], ["tarjeta", "tarjeta"], ["cuenta_corriente", "cuenta"]]) {
      expect(paleta).toMatch(new RegExp(`--p-medio-${token}: #[0-9a-f]{6};`));
      expect(medios).toContain(`.medio-${clase} { --medio: var(--p-medio-${token});`);
    }
  });
  it("017-E06: Mercado Pago lleva su isotipo", () => {
    const { container } = render(<IconoDeMedio medio="mercado_pago" />);
    expect(container.querySelector(".isotipo-mp")).not.toBeNull();
  });
});
