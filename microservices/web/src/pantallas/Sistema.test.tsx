/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

// Más → Sistema (specs/020): lo que vale para todos los dispositivos.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../datos/conexion", async (original) => ({ ...(await original<typeof import("../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { ErrorApi } from "../datos/conexion";
import { Sistema } from "./comun/sistema/Sistema";
import { Configuracion } from "../pruebas/configuracion";
import { olvidarAjustesVistos } from "../negocio/sistema/ajustes";
import { DE_MAS as DE_MAS_COMPU } from "./compu/marco/Mas";
import { DE_MAS as DE_MAS_CELULAR } from "./celular/App";

const AJUSTES = { sesion_segundos: 60, vinculo_dias: 30, tramos: { sesion_segundos: [0, 30, 60, 300, 600] } };
const puts = () => apiFalsa.mock.calls.filter((c) => c[1]?.method === "PUT").map((c) => JSON.parse(c[1].body));
const elegido = (grupo: string) => within(screen.getByTestId(grupo)).getAllByRole("radio").find((b) => b.getAttribute("aria-checked") === "true")?.textContent;

beforeEach(() => {
  olvidarAjustesVistos(); apiFalsa.mockReset();
  // Los ajustes del sistema; cualquier otra lista (los celulares de Configuración) viene vacía.
  apiFalsa.mockImplementation(async (r: string, o?: { method?: string; body?: string }) =>
    (r !== "/sistema/ajustes" ? [] : o?.method === "PUT" ? { ...AJUSTES, ...JSON.parse(o.body!) } : AJUSTES));
});
afterEach(() => { vi.useRealTimers(); });

describe("Más → Sistema", () => {
  it("020-E12 023-E33: los dos renglones con su valor y su línea (el del celular emparejado ya no está); los mismos tramos en el celular y la computadora, con el texto largo o resumido", async () => {
    const { unmount } = render(<Sistema />);
    await waitFor(() => expect(elegido("sis-sesion")).toBe("1 min"));
    expect(within(screen.getByTestId("sis-sesion")).getAllByRole("radio").map((b) => b.textContent)).toEqual(["No", "30 s", "1 min", "5 min", "10 min"]);
    expect(screen.queryByTestId("sis-celular")).toBeNull();
    // Los días se escriben en la caja un momento después de llegar: se espera a que estén.
    await waitFor(() => expect((screen.getByTestId("sis-vinculo") as HTMLInputElement).value).toBe("30"));
    const largo = screen.getByTestId("sistema").textContent!;
    expect(largo).toContain("un cambio hecho directamente en la base tarda hasta este tiempo");
    unmount();
    render(<Sistema celular />);
    await waitFor(() => expect(elegido("sis-sesion")).toBe("1 min"));
    expect(screen.queryByTestId("sis-celular")).toBeNull();
    expect(screen.getByTestId("sistema").textContent!.length).toBeLessThan(largo.length);
  });

  it("020-E14: tocar un tramo lo guarda en el momento, sin otro botón, y dice qué quedó", async () => {
    render(<Sistema />);
    await waitFor(() => expect(elegido("sis-sesion")).toBe("1 min"));
    fireEvent.click(screen.getByTestId("sis-sesion-300"));
    expect(elegido("sis-sesion")).toBe("5 min");
    await waitFor(() => expect(screen.getByTestId("sistema-nota").textContent).toContain("Guardado para todos: la sesión se recuerda 5 minutos."));
    fireEvent.click(screen.getByTestId("sis-sesion-0"));
    await waitFor(() => expect(screen.getByTestId("sistema-nota").textContent).toContain("la sesión no se recuerda"));
    expect(puts()).toEqual([{ sesion_segundos: 300 }, { sesion_segundos: 0 }]);
  });

  it("020-E14 020-E15: los días se guardan con − y + (juntos) o escritos; fuera de 1 a 365 no se guardan y lo dice", async () => {
    render(<Sistema />);
    const dias = (await screen.findByTestId("sis-vinculo")) as HTMLInputElement;
    await waitFor(() => expect(dias.value).toBe("30"));
    vi.useFakeTimers();
    fireEvent.click(screen.getByTestId("sis-vinculo-mas"));
    fireEvent.click(screen.getByTestId("sis-vinculo-mas"));
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });
    vi.useRealTimers();
    await waitFor(() => expect(puts()).toEqual([{ vinculo_dias: 32 }]));
    fireEvent.change(dias, { target: { value: "400" } });
    fireEvent.keyDown(dias, { key: "Enter" });
    expect(screen.getByTestId("sis-vinculo-error").textContent).toBe("Puede ir de 1 a 365 días. No se guardó: sigue en 32.");
    fireEvent.change(dias, { target: { value: "45" } });
    fireEvent.blur(dias);
    await waitFor(() => expect(puts()).toEqual([{ vinculo_dias: 32 }, { vinculo_dias: 45 }]));
    expect(screen.queryByTestId("sis-vinculo-error")).toBeNull();
  });

  it("con el teclado, ← → recorren los tramos sin elegir, y Enter elige", async () => {
    render(<Sistema />);
    await waitFor(() => expect(elegido("sis-sesion")).toBe("1 min"));
    const uno = screen.getByTestId("sis-sesion-60");
    uno.focus();
    fireEvent.keyDown(uno, { key: "ArrowRight" });
    expect(document.activeElement).toBe(screen.getByTestId("sis-sesion-300"));
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByTestId("sis-sesion-30"));
    expect(puts()).toEqual([]);
    fireEvent.click(document.activeElement!); // Enter o espacio sobre un botón lo activan
    await waitFor(() => expect(puts()).toEqual([{ sesion_segundos: 30 }]));
  });

  it("si el servidor lo rechaza, dice su mensaje y el valor vuelve a lo guardado", async () => {
    render(<Sistema />);
    await waitFor(() => expect(elegido("sis-sesion")).toBe("1 min"));
    apiFalsa.mockRejectedValueOnce(new ErrorApi(403, "No tenés permiso para esto. Hace falta: Administrar el sistema"));
    fireEvent.click(screen.getByTestId("sis-sesion-600"));
    expect((await screen.findByTestId("sistema-error")).textContent).toContain("Administrar el sistema");
    expect(elegido("sis-sesion")).toBe("1 min");
  });

  it("sin conexión lo dice y no deja cambiar; se ve lo último que se guardó", async () => {
    const { unmount } = render(<Sistema />);
    await waitFor(() => expect(elegido("sis-sesion")).toBe("1 min"));
    unmount();
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Sistema celular />);
    expect((await screen.findByTestId("sistema-sin-conexion")).textContent).toBe("Sin conexión: para cambiar los ajustes del sistema hace falta internet. Se ve lo último que se guardó.");
    expect(elegido("sis-sesion")).toBe("1 min");
    expect((screen.getByTestId("sis-sesion-300") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("sis-vinculo") as HTMLInputElement).disabled).toBe(true);
  });

  it("020-E13: en Más, «Sistema» está después de Configuración y pide «Administrar el sistema», en las dos interfaces", () => {
    for (const lista of [DE_MAS_COMPU.map((d) => ({ clave: d.ruta, pide: d.pide })), DE_MAS_CELULAR.map((d) => ({ clave: d.parte, pide: d.pide }))]) {
      const i = lista.findIndex((d) => d.clave === "sistema");
      expect(lista[i - 1]?.clave).toBe("configuracion");
      expect(lista[i]?.pide).toEqual(["admin.sistema"]);
    }
  });

  it("020-E17: en Configuración no hay nada para cambiar estos tiempos en el propio dispositivo", () => {
    apiFalsa.mockResolvedValue([]); // Configuración pide la lista de celulares con huella
    render(<Configuracion alCambiarElGuardado={() => undefined} />);
    const texto = screen.getByTestId("configuracion").textContent!;
    for (const nombre of ["Cuánto recuerda la sesión", "Cada cuánto pregunta el celular", "Cuántos días dura el vínculo"]) expect(texto).not.toContain(nombre);
  });
});
