/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const entrarConGoogle = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../negocio/vinculo", async (original) => ({ ...(await original<typeof import("../../negocio/vinculo")>()), entrarConGoogle: (...a: unknown[]) => entrarConGoogle(...a) }));

// El botón de Google, de mentira: guarda la función que Google llama al volver con la cuenta.
let alVolverDeGoogle: ((r: { credential: string }) => Promise<void>) | null = null;
function googleDeMentira() {
  (window as any).google = { accounts: { id: { initialize: (o: { callback: typeof alVolverDeGoogle }) => { alVolverDeGoogle = o.callback; }, renderButton: () => undefined } } };
}

// 007-T021: al volver de Google, mientras se abre la sesión, no se ve la entrada.
describe("Conectando tu cuenta de Google", () => {
  beforeEach(() => { vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "prueba.apps.googleusercontent.com"); vi.resetModules(); alVolverDeGoogle = null; googleDeMentira(); entrarConGoogle.mockReset(); });

  async function boton() {
    const { BotonGoogle } = await import("./pantallas/Login");
    render(<BotonGoogle conPantallaDeCarga />);
    await waitFor(() => expect(alVolverDeGoogle).not.toBeNull());
  }

  it("con la cuenta confirmada por Google, se ve «Conectando tu cuenta de Google» con sus dos pasos", async () => {
    entrarConGoogle.mockReturnValue(new Promise(() => undefined)); // el servidor todavía no contestó
    await boton();
    await act(async () => { void alVolverDeGoogle!({ credential: "x" }); });
    const pantalla = await screen.findByTestId("conectando-con-google");
    expect(pantalla.textContent).toContain("Conectando tu cuenta de Google");
    expect(pantalla.textContent).toContain("Cuenta de Google verificada");
    expect(pantalla.textContent).toContain("Abriendo tu sesión");
    expect(pantalla.querySelectorAll(".cg-pasos li")).toHaveLength(2);
  });

  // Tocar el botón de Google pone el foco en su recuadro (un iframe) y la ventana pierde el foco.
  function irAGoogleYVolver() {
    const recuadro = document.createElement("iframe");
    document.querySelector(".boton-google")!.appendChild(recuadro);
    recuadro.focus();
    fireEvent.blur(window);
    fireEvent.focus(window);
  }

  it("007-T023 al volver de la ventana de Google, la pantalla sale enseguida, antes de que Google mande la cuenta", async () => {
    await boton();
    act(() => irAGoogleYVolver());
    expect(screen.getByTestId("conectando-con-google")).toBeTruthy();
  });

  it("007-T023 si se vuelve de Google sin cuenta (se canceló), a los pocos segundos vuelve la entrada", async () => {
    await boton();
    vi.useFakeTimers();
    try {
      act(() => irAGoogleYVolver());
      expect(screen.getByTestId("conectando-con-google")).toBeTruthy();
      act(() => { vi.advanceTimersByTime(6001); });
      expect(screen.queryByTestId("conectando-con-google")).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("si el servidor no deja entrar, vuelve la entrada con el error", async () => {
    entrarConGoogle.mockRejectedValue(new Error("Ese correo no está autorizado"));
    await boton();
    await act(async () => { await alVolverDeGoogle!({ credential: "x" }); });
    expect(screen.queryByTestId("conectando-con-google")).toBeNull();
    expect(screen.getByTestId("error-google").textContent).toContain("no está autorizado");
  });
});
