import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Hoja } from "./base";

// 001, «Lo de atrás queda quieto»: con una hoja abierta, la pantalla de atrás no se desplaza.
describe("la hoja del celular", () => {
  it("001-T025: traba la página de atrás mientras haya alguna hoja abierta, también apiladas", () => {
    const html = document.documentElement;
    const ficha = render(<Hoja alCerrar={() => undefined}>ficha</Hoja>);
    expect(html.classList.contains("con-hoja")).toBe(true);
    const explicacion = render(<Hoja alCerrar={() => undefined}>explicación</Hoja>);
    explicacion.unmount();
    expect(html.classList.contains("con-hoja")).toBe(true); // queda la ficha
    ficha.unmount();
    expect(html.classList.contains("con-hoja")).toBe(false);
  });
});
