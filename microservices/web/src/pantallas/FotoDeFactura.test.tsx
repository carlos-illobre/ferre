/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a), reducirImagen: async (f: File) => f }));

const falso = vi.hoisted(() => ({ enlace: null as unknown as ReturnType<typeof import("../pruebas/enlace-falso")["crearEnlaceFalso"]> }));
vi.mock("../enlace", async () => { const { crearEnlaceFalso } = await import("../pruebas/enlace-falso"); falso.enlace = crearEnlaceFalso(); return falso.enlace.modulo; });

import { FotoDeFactura } from "./FotoDeFactura";
import { FotoParaLaCompu } from "./FotoParaLaCompu";
import { PedidosDeLaCompu } from "./PedidosDeLaCompu";

const FOTO = "5d1f0a52-93a1-4f0e-8c1b-7a2e6d4c9b10.jpg";

// La foto del comprobante reemplaza al número (RF-50) y, en la computadora, llega desde el
// celular emparejado por la conexión entre los dos (decisiones 32, 41 y 152).
describe("foto de la factura", () => {
  const subidas: FormData[] = [];
  beforeEach(() => {
    subidas.length = 0; falso.enlace.olvidar();
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => {
      if (ruta === "/compras/fotos") { subidas.push(opciones!.body as FormData); return { foto: FOTO }; }
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

  it("023-E17: en la computadora, con el celular emparejado, pide la foto sin código QR y la recibe sola cuando el celular la manda", async () => {
    localStorage.setItem("ferre.puesto.prueba", JSON.stringify({ id: "p1", expira_en: "2099-01-01T00:00:00Z" }));
    const alCambiar = vi.fn();
    render(<FotoDeFactura foto={null} alCambiar={alCambiar} conCelular nombre="factura" />);
    fireEvent.click(screen.getByTestId("foto-con-celular"));
    expect(screen.getByTestId("pedida-al-celular")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    const pedido = falso.enlace.mandados.find((m) => m.tipo === "pedir-foto") as { id: string; para: string };
    expect(pedido.para).toBe("la foto de la factura");
    expect(alCambiar).not.toHaveBeenCalled(); // todavía no llegó
    falso.enlace.llega({ tipo: "foto", id: "otro", imagen: "data:image/jpeg;base64,eA==" }); // de otro pedido: no es esta
    falso.enlace.llega({ tipo: "foto", id: pedido.id, imagen: "data:text/html;base64,eA==" }); // no es una imagen: no se toma
    expect(alCambiar).not.toHaveBeenCalled();
    falso.enlace.llega({ tipo: "foto", id: pedido.id, imagen: "data:image/jpeg;base64,eA==" });
    await waitFor(() => expect(alCambiar).toHaveBeenCalledWith(FOTO));
    expect(subidas).toHaveLength(1); // la computadora la sube como si la hubiera elegido de un archivo
    localStorage.removeItem("ferre.puesto.prueba");
  });

  it("023-E24: sin celular emparejado, no hay código QR: dice que se elija un archivo o se vincule el celular", () => {
    render(<FotoDeFactura foto={null} alCambiar={vi.fn()} conCelular nombre="factura" />);
    fireEvent.click(screen.getByTestId("foto-con-celular"));
    expect(screen.getByTestId("foto-sin-celular").textContent).toContain("Vincular el celular");
    expect(screen.queryByRole("img")).toBeNull();
    expect(falso.enlace.mandados).toEqual([]);
  });

  it("023-E30: el celular saca la foto del pedido y la manda entera a la computadora", async () => {
    // En el celular, el aviso de la computadora ya está escuchando cuando llega el pedido.
    render(<PedidosDeLaCompu alSacar={() => {}} alLeer={() => {}} />);
    act(() => falso.enlace.llega({ tipo: "pedir-foto", id: "f1", para: "la foto de la factura" }));
    render(<FotoParaLaCompu codigo="f1" />);
    expect(screen.getByTestId("foto-para-la-compu").textContent).toContain("la foto de la factura");
    fireEvent.change(screen.getByTestId("archivo-para-la-compu"), { target: { files: [new File(["imagen"], "f.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("ya está en la computadora"));
    const foto = falso.enlace.mandados.find((m) => m.tipo === "foto") as { id: string; imagen: string };
    expect(foto.id).toBe("f1");
    expect(atob(foto.imagen.split(",")[1]!)).toBe("imagen");
  });

  it("un pedido que ya no está se dice con claridad y no deja sacar la foto", () => {
    render(<FotoParaLaCompu codigo="vencido" />);
    expect(screen.getByRole("alert").textContent).toContain("Este pedido ya no está");
    expect(screen.queryByTestId("sacar-comprobante")).toBeNull();
  });
});
