import { describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { FotoProducto } from "./Foto";

const unInstante = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });
const volver = () => act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });

// El botón de volver del celular cierra la foto abierta en grande, en vez de cambiar de pantalla.
describe("foto de un producto", () => {
  it("la foto de un producto abierta en grande se cierra con «volver», y la pantalla de atrás sigue ahí", async () => {
    render(<><p data-testid="pantalla">Depósito</p><FotoProducto id="p1" url={null} descripcion="MECHA 8 MM" /></>);
    fireEvent.click(screen.getByTestId("foto-chica"));
    await unInstante();
    expect(screen.getByTestId("foto-grande")).toBeTruthy();
    expect((history.state as { encima?: boolean }).encima).toBe(true);
    volver();
    await unInstante();
    expect(screen.queryByTestId("foto-grande")).toBeNull();
    expect(screen.getByTestId("pantalla")).toBeTruthy();
  });
});
