/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a), reducirImagen: async (f: File) => f }));
vi.mock("qrcode", () => ({ default: { toDataURL: async (texto: string) => `data:qr,${texto}` } }));

import { FotoDeFactura } from "./FotoDeFactura";
import { FotoParaLaCompu } from "./FotoParaLaCompu";

const FOTO = "5d1f0a52-93a1-4f0e-8c1b-7a2e6d4c9b10.jpg";

// La foto del comprobante reemplaza al número (RF-50) y, en la computadora, llega desde el
// celular con un código QR (decisiones 32, 41 y 42).
describe("foto de la factura", () => {
  let lista: boolean;
  const subidas: FormData[] = [];
  beforeEach(() => {
    lista = false; subidas.length = 0;
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => {
      if (ruta === "/compras/fotos") { subidas.push(opciones!.body as FormData); return { foto: FOTO }; }
      if (ruta === "/pedidos-de-foto" && opciones?.method === "POST") return { codigo: "cod-1", expiraEnSegundos: 600 };
      if (ruta === "/pedidos-de-foto/cod-1") return { para: "la foto de la factura", lista };
      if (ruta === "/pedidos-de-foto/cod-1/foto") { lista = true; return { ok: true }; }
      if (ruta === "/pedidos-de-foto/vencido") throw Object.assign(new Error("venció"), { estado: 404 });
      return {};
    });
    globalThis.fetch = vi.fn(async () => ({ ok: true, blob: async () => new Blob(["imagen"], { type: "image/jpeg" }) })) as never;
    Object.defineProperty(URL, "createObjectURL", { value: () => "blob:prueba", configurable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: () => undefined, configurable: true });
  });

  it("en el celular: se saca la foto, se sube y queda para verla; no hay campo de número", async () => {
    const alCambiar = vi.fn();
    render(<FotoDeFactura foto={null} alCambiar={alCambiar} nombre="factura" />);
    expect(screen.getByTestId("foto-comprobante").textContent).toContain("El número no se escribe");
    expect(screen.queryByTestId("foto-con-celular")).toBeNull();
    fireEvent.change(screen.getByTestId("archivo-comprobante"), { target: { files: [new File(["x"], "f.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(alCambiar).toHaveBeenCalledWith(FOTO));
  });

  it("con la foto cargada se puede ver en grande, cambiar y quitar; el remito se nombra bien", () => {
    const alCambiar = vi.fn();
    render(<FotoDeFactura foto={FOTO} alCambiar={alCambiar} nombre="remito" />);
    expect(screen.getByTestId("foto-comprobante").textContent).toContain("Foto del remito cargada");
    expect(screen.getByRole("button", { name: "Ver la foto del remito en grande" })).toBeTruthy();
    fireEvent.click(screen.getByTestId("quitar-comprobante"));
    expect(alCambiar).toHaveBeenCalledWith(null);
  });

  it("en la computadora: pide la foto, muestra el código QR y la recibe sola cuando el celular la manda", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const alCambiar = vi.fn();
      render(<FotoDeFactura foto={null} alCambiar={alCambiar} conCelular nombre="factura" />);
      fireEvent.click(screen.getByTestId("foto-con-celular"));
      const qr = await waitFor(() => screen.getByAltText("Código para sacar la foto con el celular") as HTMLImageElement);
      expect(qr.src).toContain("#/foto?codigo=cod-1");
      await vi.advanceTimersByTimeAsync(2100);
      expect(alCambiar).not.toHaveBeenCalled(); // todavía no llegó
      lista = true;
      await vi.advanceTimersByTimeAsync(2100);
      await waitFor(() => expect(alCambiar).toHaveBeenCalledWith(FOTO));
      expect(subidas).toHaveLength(1); // la computadora la sube como si la hubiera elegido de un archivo
    } finally { vi.useRealTimers(); }
  });

  it("el celular que lee el código saca la foto y la manda con ese código", async () => {
    render(<FotoParaLaCompu codigo="cod-1" />);
    expect((await screen.findByTestId("sacar-comprobante")).textContent).toBe("Sacar la foto");
    expect(screen.getByTestId("foto-para-la-compu").textContent).toContain("la foto de la factura");
    fireEvent.change(screen.getByTestId("archivo-para-la-compu"), { target: { files: [new File(["x"], "f.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("ya está en la computadora"));
    expect(apiFalsa).toHaveBeenCalledWith("/pedidos-de-foto/cod-1/foto", expect.objectContaining({ method: "POST" }));
  });

  it("un código vencido se dice con claridad y no deja sacar la foto", async () => {
    render(<FotoParaLaCompu codigo="vencido" />);
    expect((await screen.findByRole("alert")).textContent).toContain("El código venció");
    expect(screen.queryByTestId("sacar-comprobante")).toBeNull();
  });
});
