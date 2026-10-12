/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { guardarPuestoRemoto } from "../puesto";
import { PedidosDeLaCompu } from "./PedidosDeLaCompu";

const unInstante = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });

// El celular emparejado se entera solo de que la computadora pide una foto (decisión 58).
describe("la computadora pide una foto al celular emparejado", () => {
  beforeEach(() => { apiFalsa.mockReset(); apiFalsa.mockResolvedValue({ lector: false, fotos: [{ codigo: "c-1", para: "la factura del ingreso" }] }); });

  it("sin emparejar no pregunta ni muestra nada", async () => {
    render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={vi.fn()} />);
    await unInstante();
    expect(apiFalsa).not.toHaveBeenCalled();
    expect(screen.queryByTestId("pedido-de-la-compu")).toBeNull();
  });

  it("emparejado: aparece el aviso con para qué es, y «Sacar la foto» lleva a sacarla con ese pedido", async () => {
    guardarPuestoRemoto({ id: "p1", nombre: "computadora", expira_en: "2099-01-01T00:00:00Z" });
    const alSacar = vi.fn();
    render(<PedidosDeLaCompu alSacar={alSacar} alLeer={vi.fn()} />);
    expect((await screen.findByTestId("pedido-de-la-compu")).textContent).toContain("la factura del ingreso");
    expect(apiFalsa).toHaveBeenCalledWith("/puestos/avisos");
    fireEvent.click(screen.getByTestId("sacar-foto-para-la-compu"));
    expect(alSacar).toHaveBeenCalledWith("c-1");
  });

  it("«Ahora no» lo saca de la vista, y el emparejamiento que llega después empieza a preguntar", async () => {
    render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={vi.fn()} />);
    await unInstante();
    expect(apiFalsa).not.toHaveBeenCalled();
    act(() => { guardarPuestoRemoto({ id: "p1", nombre: null, expira_en: "2099-01-01T00:00:00Z" }); });
    fireEvent.click(await screen.findByRole("button", { name: "Ahora no" }));
    expect(screen.queryByTestId("pedido-de-la-compu")).toBeNull();
  });

  // Decisión 59: la computadora le pide que haga de lector.
  it("si la computadora quiere escanear, «Abrir el lector» lo abre y da el pedido por atendido", async () => {
    guardarPuestoRemoto({ id: "p1", nombre: null, expira_en: "2099-01-01T00:00:00Z" });
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/puestos/avisos" ? { lector: true, fotos: [] } : undefined));
    const alLeer = vi.fn();
    render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={alLeer} />);
    expect((await screen.findByTestId("lector-para-la-compu")).textContent).toContain("La computadora quiere escanear");
    fireEvent.click(screen.getByTestId("abrir-el-lector"));
    expect(alLeer).toHaveBeenCalledTimes(1);
    expect(apiFalsa).toHaveBeenCalledWith("/puestos/avisos/lector", { method: "DELETE" });
    expect(screen.queryByTestId("lector-para-la-compu")).toBeNull();
  });
});
