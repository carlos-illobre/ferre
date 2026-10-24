/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
const pedidosDelEspejo = vi.hoisted(() => new Set<() => void>());
vi.mock("../espejo", async (original) => ({ ...(await original<typeof import("../espejo")>()), alPedidoDeLaCompu: (o: () => void) => { pedidosDelEspejo.add(o); return () => pedidosDelEspejo.delete(o); } }));
import { guardarPuestoRemoto } from "../puesto";
import { PedidosDeLaCompu } from "./PedidosDeLaCompu";
import { olvidarAjustes, ponerAjustes } from "../datos/sesion";

const unInstante = () => act(async () => { await new Promise((r) => setTimeout(r, 10)); });

// El celular emparejado se entera solo de que la computadora pide una foto (decisión 58).
describe("la computadora pide una foto al celular emparejado", () => {
  beforeEach(() => { olvidarAjustes(); apiFalsa.mockReset(); apiFalsa.mockResolvedValue({ lector: false, fotos: [{ codigo: "c-1", para: "la factura del ingreso" }] }); });

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

  // Decisión 112: el aviso del espejo hace preguntar en el momento, sin esperar la próxima vuelta.
  it("002-E18d 020-E08 emparejado: cuando el espejo avisa que la computadora pidió algo, pregunta en el momento", async () => {
    guardarPuestoRemoto({ id: "p1", nombre: "computadora", expira_en: "2099-01-01T00:00:00Z" });
    apiFalsa.mockResolvedValue({ lector: false, fotos: [] });
    const { unmount } = render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={vi.fn()} />);
    await unInstante();
    expect(apiFalsa).toHaveBeenCalledTimes(1);
    apiFalsa.mockResolvedValue({ lector: true, fotos: [] });
    await act(async () => { pedidosDelEspejo.forEach((o) => o()); });
    expect(await screen.findByTestId("lector-para-la-compu")).toBeTruthy();
    expect(apiFalsa).toHaveBeenCalledTimes(2);
    unmount();
    expect(pedidosDelEspejo.size).toBe(0);
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

// La pregunta de respaldo va cada el tiempo que fija quien administra (specs/020, RF-134).
describe("cada cuánto pregunta el celular emparejado", () => {
  beforeEach(() => {
    olvidarAjustes(); apiFalsa.mockReset(); apiFalsa.mockResolvedValue({ lector: false, fotos: [] });
    guardarPuestoRemoto({ id: "p1", nombre: "computadora", expira_en: "2099-01-01T00:00:00Z" });
  });
  const avanzar = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

  it("020-E07 020-E10: con 1 minuto, en 5 minutos sin pedidos pregunta 6 veces (al empezar y una por minuto), no 100; sin el espejo, un pedido aparece a más tardar en ese minuto", async () => {
    vi.useFakeTimers();
    try {
      render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={vi.fn()} />);
      await avanzar(5 * 60_000);
      expect(apiFalsa).toHaveBeenCalledTimes(6);
    } finally { vi.useRealTimers(); }
  });

  it("020-E16: un tiempo nuevo que llega con la sesión vale sin volver a entrar", async () => {
    vi.useFakeTimers();
    try {
      render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={vi.fn()} />);
      await avanzar(0);
      apiFalsa.mockClear();
      act(() => ponerAjustes({ celular_segundos: 5 }));
      await avanzar(20_000);
      expect(apiFalsa.mock.calls.length).toBeGreaterThanOrEqual(4); // una al cambiar y una cada 5 segundos
    } finally { vi.useRealTimers(); }
  });

  it("020-E09: al volver la conexión o a la aplicación pregunta en el momento", async () => {
    render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={vi.fn()} />);
    await unInstante();
    apiFalsa.mockClear();
    await act(async () => { window.dispatchEvent(new Event("online")); });
    expect(apiFalsa).toHaveBeenCalledTimes(1);
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(apiFalsa).toHaveBeenCalledTimes(2);
  });

  it("020-E11: con la aplicación oculta no pregunta", async () => {
    vi.useFakeTimers();
    const visible = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState");
    try {
      Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
      render(<PedidosDeLaCompu alSacar={vi.fn()} alLeer={vi.fn()} />);
      await avanzar(3 * 60_000);
      expect(apiFalsa).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (document as unknown as { visibilityState?: string }).visibilityState;
      if (visible) Object.defineProperty(Document.prototype, "visibilityState", visible);
    }
  });
});
