import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { useTeclasGlobales, zonasConTeclasPropias } from "./teclas";

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

  it("con el foco en una zona que la aplicación recorre por su cuenta (su menú, sus pestañas), las flechas no llegan a la pantalla", () => {
    zonasConTeclasPropias(".lateral, .pestanas");
    const manejar = vi.fn();
    const { getByText } = render(<><aside className="lateral"><button>Catálogo</button></aside><nav className="pestanas"><button>Listas</button></nav><Prueba manejar={manejar} exceptoBusqueda={true} /></>);
    fireEvent.keyDown(getByText("Catálogo"), { key: "ArrowDown" });
    fireEvent.keyDown(getByText("Listas"), { key: "ArrowDown" });
    expect(manejar).not.toHaveBeenCalled();
    fireEvent.keyDown(getByText("b"), { key: "ArrowDown" });
    expect(manejar).toHaveBeenCalledTimes(1);
  });

  it("019-E01: con el foco en una pestaña (recién tocada), las letras sí llegan a la pantalla: la E corrige", () => {
    zonasConTeclasPropias(".lateral, .pestanas");
    const manejar = vi.fn();
    const { getByText } = render(<><nav className="pestanas"><button>Ventas del día</button></nav><Prueba manejar={manejar} exceptoBusqueda={true} /></>);
    fireEvent.keyDown(getByText("Ventas del día"), { key: "e" });
    fireEvent.keyDown(getByText("Ventas del día"), { key: "Delete" });
    expect(manejar).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(getByText("Ventas del día"), { key: "Enter" });
    fireEvent.keyDown(getByText("Ventas del día"), { key: "ArrowLeft" });
    expect(manejar).toHaveBeenCalledTimes(2);
  });
});
