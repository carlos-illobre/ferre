import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// Lo que la computadora le pide al celular emparejado llega por la conexión entre los dos
// (specs/023): sin preguntar al servidor y sin leer ningún código.
const falso = vi.hoisted(() => ({ enlace: null as unknown as ReturnType<typeof import("../pruebas/enlace-falso")["crearEnlaceFalso"]> }));
vi.mock("../enlace", async () => { const { crearEnlaceFalso } = await import("../pruebas/enlace-falso"); falso.enlace = crearEnlaceFalso(); return falso.enlace.modulo; });
const apiFalsa = vi.hoisted(() => vi.fn(async () => ({})));
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: apiFalsa }));
import { PedidosDeLaCompu } from "./PedidosDeLaCompu";
import { olvidarPedidos } from "../pedidos-al-celular";

beforeEach(() => { olvidarPedidos(); falso.enlace.olvidar(); apiFalsa.mockClear(); });

describe("lo que la computadora le pide al celular emparejado", () => {
  it("sin pedidos no muestra nada y no le pregunta nada al servidor (023-E05)", () => {
    render(<PedidosDeLaCompu alSacar={() => {}} alLeer={() => {}} />);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(apiFalsa).not.toHaveBeenCalled();
  });

  it("el pedido de foto aparece en el momento, con para qué es, y «Sacar la foto» lleva a sacarla (023-E17)", () => {
    const alSacar = vi.fn();
    render(<PedidosDeLaCompu alSacar={alSacar} alLeer={() => {}} />);
    act(() => falso.enlace.llega({ tipo: "pedir-foto", id: "f1", para: "la foto de la factura" }));
    expect(screen.getByTestId("pedido-de-la-compu").textContent).toContain("Para la foto de la factura");
    fireEvent.click(screen.getByTestId("sacar-foto-para-la-compu"));
    expect(alSacar).toHaveBeenCalledWith("f1");
  });

  it("«Ahora no» lo saca de la vista; lo que no tiene la forma de un pedido no aparece (023-E28)", () => {
    render(<PedidosDeLaCompu alSacar={() => {}} alLeer={() => {}} />);
    act(() => falso.enlace.llega({ tipo: "pedir-foto", id: 5, para: null } as never));
    expect(screen.queryByRole("alert")).toBeNull();
    act(() => falso.enlace.llega({ tipo: "pedir-foto", id: "f1", para: "un producto" }));
    fireEvent.click(screen.getByText("Ahora no"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("si la computadora quiere escanear, «Abrir el lector» lo abre y da el pedido por atendido", () => {
    const alLeer = vi.fn();
    render(<PedidosDeLaCompu alSacar={() => {}} alLeer={alLeer} />);
    act(() => falso.enlace.llega({ tipo: "pedir-lector" }));
    fireEvent.click(screen.getByTestId("abrir-el-lector"));
    expect(alLeer).toHaveBeenCalled();
    expect(screen.queryByTestId("lector-para-la-compu")).toBeNull();
  });
});
