/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const cred = vi.hoisted(() => ({ hay: true, vincular: vi.fn<(...a: any[]) => Promise<any>>() }));
vi.mock("../credenciales", () => ({ hayHuella: () => cred.hay, vincularEsteDispositivo: (...a: unknown[]) => cred.vincular(...a) }));
vi.mock("../pantallas/Login", () => ({ describirDispositivo: () => "Celular" }));
import { marcarEntradaConGoogle, OfrecerHuella } from "./OfrecerHuella";

// Como en el banco: la primera vez que se entra con Google desde un celular con huella se
// ofrece vincularlo; una sola vez por dispositivo.
describe("OfrecerHuella", () => {
  beforeEach(() => { cred.hay = true; cred.vincular.mockReset(); sessionStorage.clear(); localStorage.clear(); });

  it("no aparece si no se acaba de entrar con Google, ni sin huella, ni si ya se ofreció", () => {
    render(<OfrecerHuella />);
    expect(screen.queryByTestId("ofrecer-huella")).toBeNull();
    marcarEntradaConGoogle(); cred.hay = false;
    render(<OfrecerHuella />);
    expect(screen.queryByTestId("ofrecer-huella")).toBeNull();
    cred.hay = true; localStorage.setItem("ferre.huella-ofrecida", "2026-09-14");
    render(<OfrecerHuella />);
    expect(screen.queryByTestId("ofrecer-huella")).toBeNull();
  });

  it("aceptar vincula el celular y no vuelve a preguntar", async () => {
    marcarEntradaConGoogle();
    cred.vincular.mockResolvedValue({ id: "c1", dispositivo: "Celular" });
    render(<OfrecerHuella />);
    fireEvent.click(screen.getByTestId("aceptar-huella"));
    await waitFor(() => expect(screen.getByText("Listo")).toBeTruthy());
    expect(cred.vincular).toHaveBeenCalledWith("Celular");
    expect(localStorage.getItem("ferre.huella-ofrecida")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Entendido" }));
    expect(screen.queryByTestId("ofrecer-huella")).toBeNull();
  });

  it("'Ahora no' cierra y tampoco vuelve a preguntar", () => {
    marcarEntradaConGoogle();
    render(<OfrecerHuella />);
    fireEvent.click(screen.getByTestId("ahora-no"));
    expect(screen.queryByTestId("ofrecer-huella")).toBeNull();
    expect(localStorage.getItem("ferre.huella-ofrecida")).toBeTruthy();
    expect(cred.vincular).not.toHaveBeenCalled();
  });

  it("si la huella no se leyó, lo dice y deja la puerta a Administración", async () => {
    marcarEntradaConGoogle();
    cred.vincular.mockRejectedValue(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    render(<OfrecerHuella />);
    fireEvent.click(screen.getByTestId("aceptar-huella"));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("desde Administración"));
    expect(localStorage.getItem("ferre.huella-ofrecida")).toBeNull();
  });
});
