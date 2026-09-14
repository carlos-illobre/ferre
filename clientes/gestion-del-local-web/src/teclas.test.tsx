import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { useTeclasGlobales } from "./teclas";

function Prueba({ manejar, exceptoBusqueda }: { manejar: (e: KeyboardEvent) => void; exceptoBusqueda: boolean }) {
  const [caja, setCaja] = useState<HTMLInputElement | null>(null);
  useTeclasGlobales(manejar, exceptoBusqueda ? caja : null);
  return <><input data-testid="busqueda" ref={setCaja} /><input data-testid="otro" /><button>b</button></>;
}

// Las flechas y Shift+1..5 funcionan aunque la búsqueda no tenga el foco, pero no roban
// las teclas cuando el foco está en otro campo.
describe("useTeclasGlobales", () => {
  it("atiende las teclas en el documento y en la caja de búsqueda, no en otros campos", () => {
    const manejar = vi.fn();
    const { getByTestId, getByText } = render(<Prueba manejar={manejar} exceptoBusqueda={true} />);
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    fireEvent.keyDown(getByText("b"), { key: "ArrowDown" });
    fireEvent.keyDown(getByTestId("busqueda"), { key: "ArrowDown" });
    expect(manejar).toHaveBeenCalledTimes(3);
    fireEvent.keyDown(getByTestId("otro"), { key: "ArrowDown" });
    expect(manejar).toHaveBeenCalledTimes(3);
  });
});
