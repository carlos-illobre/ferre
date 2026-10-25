import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

// Avisos sin consultas en la aplicación (specs/025): la versión nueva, lo pendiente y el código para
// vincular el celular, sin temporizadores que pregunten a la red.
const enviar = vi.hoisted(() => vi.fn(async () => 0));
vi.mock("../datos/almacenamiento", async (original) => ({ ...(await original<typeof import("../datos/almacenamiento")>()), enviarPendientes: enviar }));
const apiFalsa = vi.hoisted(() => vi.fn());
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("qrcode", () => ({ default: { toDataURL: async () => "data:image/png;base64,x" } }));
const { avisos } = await import("../datos/conexion");
const { alCambiarLaVersion } = await import("./version");
const { useEstadoDeLaConexion } = await import("./conexion");
const { useCodigoParaVincular } = await import("./vinculo");
const { puestoLocal } = await import("../datos/vinculo");

// El servidor: cada pedido queda anotado; el canal es un flujo que queda abierto.
const canales: ReadableStreamDefaultController<Uint8Array>[] = [];
const pedidos: string[] = [];
beforeEach(() => {
  canales.length = 0; pedidos.length = 0; enviar.mockClear(); apiFalsa.mockReset();
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    pedidos.push(new URL(url).pathname);
    return new Response(new ReadableStream<Uint8Array>({ start: (c) => { canales.push(c); } }), { status: 200 });
  }));
  act(() => { window.dispatchEvent(new Event("online")); });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("la versión nueva", () => {
  it("025-E09: se busca solo cuando la versión que dice el servidor cambia; la primera queda de referencia", () => {
    const buscar = vi.fn();
    const dejar = alCambiarLaVersion(buscar);
    avisos.respondio('{"version":"v1"}');
    avisos.respondio('{"version":"v1"}');
    expect(buscar).not.toHaveBeenCalled();
    avisos.respondio('{"version":"v2"}');
    expect(buscar).toHaveBeenCalledTimes(1);
    dejar();
  });

  it("025-E08: sin uso no se pregunta nada: ni con el tiempo, ni al volver a la aplicación, ni al volver la red", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    const dejar = alCambiarLaVersion(vi.fn());
    await act(async () => { await vi.advanceTimersByTimeAsync(24 * 3_600_000); });
    act(() => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("online")); });
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(pedidos).toEqual([]);
    dejar();
  });
});

describe("lo pendiente", () => {
  it("025-E17: se manda al abrir y cuando el navegador avisa que volvió la red", async () => {
    renderHook(() => useEstadoDeLaConexion());
    expect(enviar).toHaveBeenCalledTimes(1);
    enviar.mockClear();
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(enviar).not.toHaveBeenCalled();
    act(() => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
  });

  it("025-E18: tras un corte del que el navegador no avisó, se manda cuando el servidor vuelve a contestar", async () => {
    const { result } = renderHook(() => useEstadoDeLaConexion());
    enviar.mockClear();
    act(() => { avisos.fallo(); });
    expect(result.current.enLinea).toBe(false);
    act(() => { avisos.respondio(null); });
    expect(result.current.enLinea).toBe(true);
    await waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
  });

  it("025-E19: no hay reintentos a ritmo fijo: con el tiempo no se manda ni se pregunta nada", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    renderHook(() => useEstadoDeLaConexion());
    enviar.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(60 * 60_000); });
    expect(enviar).not.toHaveBeenCalled();
    expect(pedidos).toEqual([]);
  });

  it("025-E18: si algo quedó sin salir con el servidor contestando (un error), sale con la próxima respuesta después de un minuto", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    renderHook(() => useEstadoDeLaConexion());
    enviar.mockClear();
    act(() => { avisos.respondio(null); });
    expect(enviar).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(61_000); });
    expect(enviar).not.toHaveBeenCalled(); // sin respuestas, nada
    act(() => { avisos.respondio(null); });
    expect(enviar).toHaveBeenCalledTimes(1);
  });
});

describe("el código para vincular el celular", () => {
  it("025-E02: la computadora espera por el canal y queda vinculada cuando el servidor avisa, sin preguntar", async () => {
    apiFalsa.mockResolvedValue({ id: "p1", codigo: "c", expiraEnSegundos: 300 });
    const alVincular = vi.fn();
    const { result } = renderHook(() => useCodigoParaVincular(alVincular, { ancho: 200 }));
    await act(async () => { await result.current.generar(); });
    await waitFor(() => expect(canales).toHaveLength(1));
    act(() => { canales[0]!.enqueue(new TextEncoder().encode('data: {"t":"puesto:p1","d":{"expira_en":"2026-11-11T00:00:00Z"}}\n\n')); });
    await waitFor(() => expect(alVincular).toHaveBeenCalledWith("p1"));
    expect(puestoLocal()).toMatchObject({ id: "p1", expira_en: "2026-11-11T00:00:00Z" });
    expect(apiFalsa).toHaveBeenCalledTimes(1);
    expect(result.current.qr).toBeNull();
  });

  it("al vencer deja de esperar y lo dice, sin haber preguntado nada", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    apiFalsa.mockResolvedValue({ id: "p2", codigo: "c", expiraEnSegundos: 300 });
    const { result } = renderHook(() => useCodigoParaVincular(vi.fn(), { ancho: 200 }));
    await act(async () => { await result.current.generar(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
    expect(result.current.vencido).toBe(true);
    expect(pedidos).toEqual(["/canal"]);
    expect(apiFalsa).toHaveBeenCalledTimes(1);
  });
});
