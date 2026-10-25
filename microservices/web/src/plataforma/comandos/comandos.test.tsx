import { afterEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { olvidarLasOfertas, pedir, useComandos, type Acciones } from ".";

function Ofrece({ acciones, encima }: { acciones: Acciones; encima?: boolean }) { useComandos(acciones, { encima }); return null; }

describe("comandos", () => {
  afterEach(olvidarLasOfertas);

  it("pide la acción de quien la ofrece, y nada cuando nadie la ofrece", () => {
    const hechas: string[] = [];
    const { unmount } = render(<Ofrece acciones={{ cobrar: () => { hechas.push("cobrar"); } }} />);
    expect(pedir("cobrar")).toBe(true);
    expect(pedir("otra")).toBe(false);
    unmount();
    expect(pedir("cobrar")).toBe(false);
    expect(hechas).toEqual(["cobrar"]);
  });

  it("lo de una ventana tapa a la pantalla, y una acción que no aplica deja pasar", () => {
    const hechas: string[] = [];
    render(<><Ofrece encima acciones={{ cerrar: () => { hechas.push("ventana"); }, nada: () => false }} /><Ofrece acciones={{ cerrar: () => { hechas.push("pantalla"); } }} /></>);
    expect(pedir("cerrar")).toBe(true);
    expect(pedir("nada")).toBe(false);
    expect(hechas).toEqual(["ventana"]);
  });
});
