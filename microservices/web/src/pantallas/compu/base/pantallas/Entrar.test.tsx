/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConRutas } from "../rutas";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../../../api", async (original) => ({ ...(await original<typeof import("../../../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
// El dibujo del QR es trabajo asíncrono de verdad: con la máquina cargada termina tarde y corre
// el momento en que vence el código. Acá es instantáneo; lo que se prueba es la entrada.
vi.mock("qrcode", () => ({ default: { toDataURL: async (texto: string) => `data:image/png;base64,${btoa(texto)}` } }));
import { Entrar, TEXTOS_DE_ENTRADA } from "./Entrar";

// La entrada de la computadora copia la imagen de referencia de Carlos (decisión 93,
// specs/007-usuarios-y-acceso/maquetas/entrar-compu-con-celular.html). En el celular no cambia.
describe("la entrada de la computadora", () => {
  beforeEach(() => {
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => ruta === "/sesiones/vinculaciones"
      ? { id: "v1", codigo: "abc", clave: "k", expiraEnSegundos: 300 }
      : { estado: "pendiente" });
  });

  it("tiene la marca a la izquierda, el celular con una venta en el medio y la tarjeta para entrar a la derecha", async () => {
    const { container } = render(<Entrar />);
    const entrada = screen.getByTestId("entrar");
    // La marca: antetítulo, título con «de la ferretería.» resaltado, bajada y lo que hace.
    expect(entrada.querySelector(".entrar-cc-antetitulo")?.textContent).toBe("El sistema del mostrador");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Precios al día,ventas y stockde la ferretería.");
    expect(entrada.querySelector("h1 em")?.textContent).toBe("de la ferretería.");
    // Cada una corta en dos renglones, en el mismo lugar que la referencia.
    const renglones = [...entrada.querySelectorAll(".entrar-cc-puntos .texto")].map((t) => t.innerHTML.split("<br>"));
    expect(renglones).toEqual([
      ["Buscás el producto,", "decís el precio y cobrás."],
      ["Los precios se actualizan", "con las listas de los proveedores."],
      ["Lo que se vende baja del stock;", "lo que se compra, sube."],
    ]);
    // Debajo, «Ver tutorial», que por ahora no lleva a ningún lado (la frase manuscrita se sacó).
    expect(screen.getByTestId("ver-tutorial").textContent).toBe("Ver tutorial");
    expect(entrada.querySelector(".entrar-cc-marca [data-testid='ver-tutorial']")).toBeTruthy();
    expect(entrada.querySelector(".entrar-cc-manuscrito")).toBeNull();
    // El medio: la foto del local y el celular con la captura de una venta, que no se leen en voz alta.
    expect(container.querySelector(".entrar-cc-fondo")?.getAttribute("aria-hidden")).toBe("true");
    const celular = container.querySelector(".entrar-cc-celular");
    expect(celular?.getAttribute("aria-hidden")).toBe("true");
    expect(celular?.getAttribute("src")).toMatch(/entrar-celular/);
    // La tarjeta: título, «Es rápido…», el código, que se renueva, Google, quién entra y el pie.
    expect(screen.getByRole("heading", { name: TEXTOS_DE_ENTRADA.conElCelular })).toBeTruthy();
    expect(screen.getByText(TEXTOS_DE_ENTRADA.rapido)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("qr-entrar").querySelector("img")).toBeTruthy());
    expect(screen.getByText(TEXTOS_DE_ENTRADA.codigoSeRenueva)).toBeTruthy();
    expect(screen.getByText(TEXTOS_DE_ENTRADA.nota)).toBeTruthy();
    expect(screen.getByText(TEXTOS_DE_ENTRADA.protegidos)).toBeTruthy();
    // Sin «¿Necesitás ayuda?»: Carlos lo sacó.
    expect(entrada.textContent).not.toContain("Necesitás ayuda");
  });

  it("C8: el código se renueva solo a los 5 minutos", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    try {
      render(<Entrar />);
      const codigos = () => apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones").length;
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(codigos()).toBe(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
      expect(codigos()).toBe(1); // mientras vale, se sigue mostrando el mismo
      await act(async () => { await vi.advanceTimersByTimeAsync(70_000); });
      expect(codigos()).toBe(2);
    } finally { vi.useRealTimers(); }
  });

  it("C10: sin internet no hay código: dice que para entrar hace falta internet", async () => {
    const onLine = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine")!;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    try {
      render(<Entrar />);
      expect(screen.getByTestId("entrar-sin-conexion").textContent).toBe(TEXTOS_DE_ENTRADA.sinConexion);
      expect(screen.queryByTestId("qr-entrar")).toBeNull();
      expect(apiFalsa).not.toHaveBeenCalledWith("/sesiones/vinculaciones", expect.anything());
      // Cuando vuelve la conexión, aparece el código.
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      act(() => { window.dispatchEvent(new Event("online")); });
      await waitFor(() => expect(screen.getByTestId("qr-entrar").querySelector("img")).toBeTruthy());
    } finally { delete (navigator as { onLine?: boolean }).onLine; Object.defineProperty(Navigator.prototype, "onLine", onLine); }
  });

  it("D4 a D6: si el servidor cerró la sesión (a distancia, vencida o el usuario desactivado), la entrada lo dice", () => {
    window.dispatchEvent(new Event("sesion-cerrada"));
    render(<Entrar />);
    expect(screen.getByTestId("sesion-cerrada").textContent).toContain("Hay que iniciar sesión");
  });

  it("012-E01: «Ver tutorial» abre el manual en la misma pestaña", async () => {
    render(<ConRutas><Entrar /></ConRutas>);
    fireEvent.click(screen.getByTestId("ver-tutorial"));
    await waitFor(() => expect(location.hash).toBe("#/manual"));
  });
});
