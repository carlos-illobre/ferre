/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

// El identificador de Google lo da el servidor (007-T043): el mismo con el que verifica las
// credenciales, así no puede haber uno distinto en la aplicación.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

let configurado: { client_id: string } | null = null;
beforeEach(() => {
  vi.resetModules();
  apiFalsa.mockReset();
  configurado = null;
  window.google = { accounts: { id: { initialize: (c) => { configurado = c; }, renderButton: () => undefined } } };
});
afterEach(() => { delete window.google; vi.useRealTimers(); });

describe("el identificador de Google", () => {
  it("el botón de Google se dibuja con el identificador que da el servidor", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/sesiones/google/cliente" ? { clienteId: "el-del-servidor.apps.googleusercontent.com" } : {}));
    const { BotonGoogle } = await import("./compu/base/pantallas/Entrar");
    render(<BotonGoogle />);
    await waitFor(() => expect(configurado?.client_id).toBe("el-del-servidor.apps.googleusercontent.com"));
  });

  it("sin conexión con el servidor lo dice, y lo vuelve a pedir solo hasta que llega", async () => {
    apiFalsa.mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValue({ clienteId: "el-del-servidor.apps.googleusercontent.com" });
    const { BotonGoogle } = await import("./celular/pantallas/Login");
    const { TEXTOS_DE_ENTRADA } = await import("./compu/base/pantallas/Entrar");
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    render(<BotonGoogle />);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText(TEXTOS_DE_ENTRADA.googleNoResponde)).toBeTruthy();
    expect(apiFalsa).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(apiFalsa).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(TEXTOS_DE_ENTRADA.googleNoResponde)).toBeNull();
  });
});
