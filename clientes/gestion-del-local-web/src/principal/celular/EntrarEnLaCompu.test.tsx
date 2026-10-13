/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { ErrorApi } from "../../api";
import { EntrarEnLaCompu } from "./EntrarEnLaCompu";
import { destinoDelCodigo, Entrar } from "./Entrar";

const huella = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../credenciales", () => ({ hayHuella: () => true, entrarConHuella: huella, huellaVinculadaAca: () => true }));
// La cámara de mentira: un botón que «lee» el código que muestra la computadora.
vi.mock("./componentes/Escaner", () => ({
  hayCamara: () => true,
  Escaner: ({ alDetectar }: { alDetectar: (c: string) => void }) => <button type="button" data-testid="camara" onClick={() => alDetectar("https://ejemplo.test/#/entrar-compu?codigo=abc")}>leer</button>,
}));

// Entrar a la computadora con el celular (RF-76, decisión 57): sin paso de confirmar.
describe("el celular deja entrar a la computadora", () => {
  beforeEach(() => { apiFalsa.mockReset(); apiFalsa.mockResolvedValue({ dispositivo: "computadora · Chrome" }); });
  const aprobaciones = () => apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones/aprobar");

  it("recién entrado con la huella: la computadora entra sola, sin preguntar", async () => {
    render(<EntrarEnLaCompu codigo="abc" automatico nombre="Carlos" />);
    expect(screen.queryByTestId("dejar-entrar")).toBeNull();
    expect((await screen.findByTestId("compu-entro")).textContent).toContain("la computadora ya entró");
    expect(aprobaciones()).toHaveLength(1);
    expect(JSON.parse(aprobaciones()[0]![1].body)).toEqual({ codigo: "abc" });
    expect(screen.getByText(/Entraste como/).textContent).toContain("Carlos");
  });

  it("con la sesión ya abierta hace falta un toque: abrir el enlace no alcanza", async () => {
    render(<EntrarEnLaCompu codigo="abc" automatico={false} nombre="Carlos" />);
    expect(screen.getByRole("heading", { name: "¿Entrar en la computadora?" })).toBeTruthy();
    expect(aprobaciones()).toHaveLength(0);
    fireEvent.click(screen.getByTestId("dejar-entrar"));
    expect(await screen.findByTestId("compu-entro")).toBeTruthy();
    expect(aprobaciones()).toHaveLength(1);
  });

  it("un código vencido o ya usado lo dice, con lo que hay que hacer", async () => {
    apiFalsa.mockRejectedValue(new ErrorApi(410, "Ese código venció o ya se usó. Leé el que la computadora muestra ahora."));
    render(<EntrarEnLaCompu codigo="viejo" automatico nombre="Carlos" />);
    await waitFor(() => expect(screen.getByTestId("compu-no-entro").textContent).toContain("Leé el que la computadora muestra ahora"));
  });

  it("sin sesión, la entrada avisa que la computadora entra también y el botón de la huella lo dice", () => {
    render(<Entrar paraLaCompu />);
    expect(screen.getByTestId("entrar-para-la-compu").textContent).toContain("esa computadora entra también");
    expect(screen.getByTestId("entrar-huella").textContent).toContain("Entrar acá y en la computadora");
  });

  it("escaneado el código desde la entrada, pide la huella enseguida; llegando por un enlace, espera el toque", async () => {
    huella.mockReset(); huella.mockRejectedValue(Object.assign(new Error("x"), { name: "NotAllowedError" }));
    const { rerender, unmount } = render(<Entrar />);
    fireEvent.click(screen.getByTestId("escanear-codigo-de-la-compu"));
    fireEvent.click(screen.getByTestId("camara"));
    expect(location.hash).toBe("#/entrar-compu?codigo=abc");
    rerender(<Entrar paraLaCompu />);
    await waitFor(() => expect(huella).toHaveBeenCalledTimes(1));
    // No se leyó la huella: lo dice y el botón queda para probar de nuevo, sin insistir solo.
    expect((await screen.findByTestId("error-huella")).textContent).toContain("Probá de nuevo");
    expect(huella).toHaveBeenCalledTimes(1);
    unmount();

    huella.mockClear();
    render(<Entrar paraLaCompu />);
    expect(huella).not.toHaveBeenCalled();
  });

  it("el código leído desde la entrada lleva solo a lo que Ferrebress muestra para el celular", () => {
    expect(destinoDelCodigo("https://ejemplo.test/ferre/#/entrar-compu?codigo=abc-DEF_123")).toBe("#/entrar-compu?codigo=abc-DEF_123");
    expect(destinoDelCodigo("https://ejemplo.test/#/vincular-celular?codigo=XY12")).toBe("#/vincular-celular?codigo=XY12");
    expect(destinoDelCodigo("https://ejemplo.test/#/foto?codigo=5d1f0a52-93a1")).toBe("#/foto?codigo=5d1f0a52-93a1");
    expect(destinoDelCodigo("7790250000358")).toBeNull();
    expect(destinoDelCodigo("https://otro-sitio.test/#/mas/usuarios")).toBeNull();
  });
});
