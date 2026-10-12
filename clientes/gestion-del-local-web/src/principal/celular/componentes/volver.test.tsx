import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";
import { useVolverCierra } from "./volver";

function Encima({ alCerrar }: { alCerrar: () => void }) { useVolverCierra(alCerrar); return <p>cámara</p>; }
const unInstante = () => act(async () => { await new Promise((r) => setTimeout(r, 5)); });
const volver = () => act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });

// El botón de volver de Android cierra el escáner; no sale de la aplicación.
describe("volver cierra lo que está encima", () => {
  it("al abrirse anota un paso en el historial y «volver» lo cierra", async () => {
    const antes = history.length;
    const alCerrar = vi.fn();
    render(<Encima alCerrar={alCerrar} />);
    await unInstante();
    expect(history.length).toBe(antes + 1);
    expect((history.state as { encima?: boolean }).encima).toBe(true);
    expect(alCerrar).not.toHaveBeenCalled();
    volver();
    expect(alCerrar).toHaveBeenCalledTimes(1);
  });

  it("si se cierra con su propio botón, saca el paso y ese aviso no cierra otra cosa", async () => {
    const atras = vi.spyOn(history, "back").mockImplementation(() => undefined);
    const primero = vi.fn();
    const { unmount } = render(<Encima alCerrar={primero} />);
    await unInstante();
    unmount();
    expect(atras).toHaveBeenCalledTimes(1);
    // Se abre otro enseguida: el aviso del paso que sacamos llega tarde y no lo tiene que cerrar.
    const segundo = vi.fn();
    render(<Encima alCerrar={segundo} />);
    await unInstante();
    volver();
    expect(segundo).not.toHaveBeenCalled();
    volver();
    expect(segundo).toHaveBeenCalledTimes(1);
    atras.mockRestore();
  });

  it("si se desmonta antes de anotar el paso, no toca el historial", () => {
    const atras = vi.spyOn(history, "back").mockImplementation(() => undefined);
    const antes = history.length;
    render(<Encima alCerrar={vi.fn()} />).unmount();
    expect(history.length).toBe(antes);
    expect(atras).not.toHaveBeenCalled();
    atras.mockRestore();
  });
});
