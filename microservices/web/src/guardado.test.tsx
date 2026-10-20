/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("./api", async (original) => ({ ...(await original<typeof import("./api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { ErrorApi } from "./api";
import { abrirBase, guardar, leerTodo, respetarElGuardado } from "./almacen";
import { enviarOEncolar, pendientes } from "./cola";
import { guardaEnElDispositivo } from "./guardado";
import { cambiarPreferencia, preferencias, recargarPreferencias } from "./preferencias";
import { Configuracion } from "./pantallas/Configuracion";

// Trabajar sin conexión en el celular (RF-84, specs/009-configuracion): el celular guarda datos
// del negocio solo si la persona lo habilita; la computadora, siempre.
// El aparato: un teléfono (Android) o una computadora, por su identificación.
const TELEFONO = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36";
const COMPUTADORA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";
const aparato = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
const hayBase = async () => (await indexedDB.databases()).some((b) => b.name === "ferre");
const venta = { id: "v1", fecha: "2026-10-13T12:00:00Z", total: 100, medio_pago: "efectivo", items: [], enviada: false };

describe("Trabajar sin conexión en el celular", () => {
  beforeEach(async () => { aparato(TELEFONO); localStorage.clear(); recargarPreferencias(); apiFalsa.mockReset(); await respetarElGuardado(); });
  afterEach(() => { aparato(COMPUTADORA); });

  it("009-E07: en un celular sin nada elegido, figura deshabilitada", () => {
    render(<Configuracion celular alCambiarElGuardado={() => undefined} />);
    expect(screen.getByTestId("cfg-sin-conexion").getAttribute("aria-checked")).toBe("false");
    expect(screen.getByTestId("configuracion").textContent).toContain("no guarda datos del negocio");
    expect(guardaEnElDispositivo()).toBe(false);
  });

  it("009-E15: «Cómo buscar productos» no aparece, ni en el celular ni en la computadora (decisión 138)", () => {
    const celular = render(<Configuracion celular alCambiarElGuardado={() => undefined} />);
    expect(screen.getByTestId("configuracion").textContent).not.toContain("Cómo buscar productos");
    celular.unmount();
    aparato(COMPUTADORA);
    render(<Configuracion alCambiarElGuardado={() => undefined} />);
    expect(screen.getByTestId("configuracion").textContent).not.toContain("Cómo buscar productos");
  });

  it("009-E08: deshabilitada, con conexión todo se manda y en el celular no queda ningún dato del negocio", async () => {
    apiFalsa.mockResolvedValue({});
    expect(await enviarOEncolar("venta", "POST", "/ventas", venta)).toEqual({ encolado: false });
    expect(apiFalsa).toHaveBeenCalledWith("/ventas", expect.objectContaining({ method: "POST" }));
    await expect(guardar("ventas", venta)).rejects.toThrow();
    await expect(abrirBase()).rejects.toThrow();
    expect(await pendientes()).toEqual([]);
    expect(await hayBase()).toBe(false);
    // Lo mínimo para la sesión y el vínculo: muy por debajo de 150 KB.
    const guardado = Object.keys(localStorage).reduce((n, k) => n + k.length + (localStorage.getItem(k) ?? "").length, 0);
    expect(guardado).toBeLessThan(150_000);
  });

  it("009-E09: deshabilitada y sin conexión, no se registra ni se guarda, y dice cómo habilitarlo", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const fallo = await enviarOEncolar("venta", "POST", "/ventas", venta).catch((e: unknown) => e);
    expect(fallo).toBeInstanceOf(ErrorApi);
    expect((fallo as Error).message).toContain("no se registró");
    expect((fallo as Error).message).toContain("habilitalo en Más → Configuración");
    expect(await pendientes()).toEqual([]);
    expect(await hayBase()).toBe(false);
  });

  it("009-E10: al habilitarla, el celular vuelve a guardar y a trabajar sin conexión como antes", async () => {
    const alCambiar = vi.fn();
    render(<Configuracion celular alCambiarElGuardado={alCambiar} />);
    fireEvent.click(screen.getByTestId("cfg-sin-conexion"));
    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(preferencias().sinConexion).toBe(true);
    expect(screen.getByTestId("cfg-sin-conexion").getAttribute("aria-checked")).toBe("true");
    // Sin conexión, la venta queda guardada en el celular esperando.
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await enviarOEncolar("venta", "POST", "/ventas", venta)).toEqual({ encolado: true });
    expect(await pendientes()).toHaveLength(1);
  });

  it("009-E11: al deshabilitarla se borra del celular todo lo guardado", async () => {
    cambiarPreferencia("sinConexion", true);
    await guardar("ventas", venta);
    expect(await leerTodo("ventas")).toHaveLength(1);
    const preguntar = vi.spyOn(window, "confirm").mockReturnValue(true);
    const alCambiar = vi.fn();
    render(<Configuracion celular alCambiarElGuardado={alCambiar} />);
    fireEvent.click(screen.getByTestId("cfg-sin-conexion"));
    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(preguntar.mock.calls[0]![0]).toContain("Se va a borrar de este celular");
    expect(preferencias().sinConexion).toBe(false);
    expect(await hayBase()).toBe(false);
    preguntar.mockRestore();
  });

  it("009-E12: con cambios sin enviar avisa cuántos se pierden y pregunta; si la persona no sigue, no pasa nada", async () => {
    cambiarPreferencia("sinConexion", true);
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    await enviarOEncolar("venta", "POST", "/ventas", venta);
    const preguntar = vi.spyOn(window, "confirm").mockReturnValue(false);
    const alCambiar = vi.fn();
    render(<Configuracion celular alCambiarElGuardado={alCambiar} />);
    fireEvent.click(screen.getByTestId("cfg-sin-conexion"));
    await waitFor(() => expect(preguntar).toHaveBeenCalledTimes(1));
    expect(preguntar.mock.calls[0]![0]).toContain("1 cambio que todavía no se envió");
    expect(preferencias().sinConexion).toBe(true);
    expect(await pendientes()).toHaveLength(1);
    expect(alCambiar).not.toHaveBeenCalled();
    // Si sigue, se pierden.
    preguntar.mockReturnValue(true);
    fireEvent.click(screen.getByTestId("cfg-sin-conexion"));
    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(await pendientes()).toEqual([]);
    preguntar.mockRestore();
  });

  it("una computadora con la ventana angosta sigue siendo una computadora: guarda, y no se le borra nada", async () => {
    aparato(COMPUTADORA);
    (window as any).innerWidth = 600;
    await guardar("ventas", venta);
    await respetarElGuardado();
    expect(guardaEnElDispositivo()).toBe(true);
    expect(await leerTodo("ventas")).toHaveLength(1);
    (window as any).innerWidth = 1024;
  });

  it("009-E13 018-E30: en la computadora la opción también aparece, y arranca habilitada: guarda como siempre", async () => {
    aparato(COMPUTADORA);
    render(<Configuracion alCambiarElGuardado={() => undefined} />);
    expect(screen.getByTestId("cfg-sin-conexion").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("configuracion").textContent).toContain("Esta computadora guarda lo que falta enviar");
    expect(guardaEnElDispositivo()).toBe(true);
    await guardar("ventas", venta);
    expect(await leerTodo("ventas")).toHaveLength(1);
  });

  it("018-E30: en la computadora se puede deshabilitar, y entonces no guarda", () => {
    aparato(COMPUTADORA);
    cambiarPreferencia("sinConexion", false);
    expect(guardaEnElDispositivo()).toBe(false);
  });

  it("009-E14: un celular que ya tenía datos guardados de antes queda deshabilitado y sin esos datos", async () => {
    // Como lo dejaba la versión anterior: datos guardados y ninguna preferencia elegida.
    cambiarPreferencia("sinConexion", true);
    await guardar("ventas", venta);
    localStorage.clear(); recargarPreferencias();
    expect(await hayBase()).toBe(true);
    await respetarElGuardado();
    expect(await hayBase()).toBe(false);
    expect(guardaEnElDispositivo()).toBe(false);
  });
});
