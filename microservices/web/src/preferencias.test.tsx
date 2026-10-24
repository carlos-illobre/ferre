import { conPermisos } from "./pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { cambiarPreferencia, preferencias, recargarPreferencias } from "./preferencias";
import { Configuracion } from "./pruebas/configuracion";
import { TEXTOS } from "./pantallas/textos";
import { animarNavegacion, ConRutas, irA } from "./rutas";

// Configuración (RF-83, specs/009-configuracion): las animaciones se habilitan o deshabilitan
// en cada dispositivo.
describe("Configuración · animaciones", () => {
  beforeEach(() => { localStorage.clear(); recargarPreferencias(); });

  it("009-E01: en un dispositivo sin nada guardado, las animaciones figuran habilitadas", () => {
    render(<Configuracion celular />);
    expect(screen.getByTestId("cfg-animaciones").getAttribute("aria-checked")).toBe("true");
    expect(document.documentElement.dataset.animaciones).toBeUndefined();
    expect(screen.getByTestId("configuracion").textContent).toContain(TEXTOS.configuracionV2.animacionesSi.corto);
  });

  it("009-E02: al deshabilitarlas vale en el momento: la página queda marcada y la navegación no arma ninguna transición", async () => {
    // La transición la arma React Router con la aplicación envuelta en sus rutas (ADR-018).
    const transicion = vi.fn((cambio: () => unknown) => { void cambio(); return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve(), skipTransition: () => undefined }; });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = transicion;
    animarNavegacion(true);
    render(<ConRutas><Configuracion celular /></ConRutas>);
    irA("mas");
    await waitFor(() => expect(transicion).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId("cfg-animaciones"));
    expect(screen.getByTestId("cfg-animaciones").getAttribute("aria-checked")).toBe("false");
    expect(document.documentElement.dataset.animaciones).toBe("no");
    expect(screen.getByTestId("configuracion").textContent).toContain("cambian en el acto");
    irA("mas/roles");
    await waitFor(() => expect(location.hash).toBe("#/mas/roles"));
    expect(transicion).toHaveBeenCalledTimes(1);
    animarNavegacion(false);
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it("009-E03: lo elegido queda en el dispositivo: sigue al volver a abrir la aplicación o al salir y volver a entrar", () => {
    cambiarPreferencia("animaciones", false);
    // Salir de la sesión no borra la preferencia: es otra clave del dispositivo.
    localStorage.removeItem("ferre.sesion");
    recargarPreferencias();
    expect(preferencias().animaciones).toBe(false);
    expect(document.documentElement.dataset.animaciones).toBe("no");
    render(<Configuracion />);
    expect(screen.getByTestId("cfg-animaciones").getAttribute("aria-checked")).toBe("false");
  });

  it("009-E04: con «reducir movimiento» pedido en el dispositivo, la pantalla lo dice", () => {
    const original = window.matchMedia;
    window.matchMedia = ((consulta: string) => ({ matches: consulta.includes("reduce"), addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
    render(<Configuracion celular />);
    expect(screen.getByTestId("cfg-reducir-movimiento").textContent).toContain("reducir movimiento");
    window.matchMedia = original;
  });

  it("009-E05: si el navegador no deja guardar, el cambio vale mientras la aplicación está abierta y no da error", () => {
    const guardar = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("sin lugar"); });
    render(<Configuracion celular />);
    expect(() => fireEvent.click(screen.getByTestId("cfg-animaciones"))).not.toThrow();
    expect(preferencias().animaciones).toBe(false);
    guardar.mockRestore();
    // Un valor guardado que no es el esperado se toma como el de arranque.
    localStorage.setItem("ferre.preferencias", JSON.stringify({ animaciones: "quizás" }));
    recargarPreferencias();
    expect(preferencias().animaciones).toBe(true);
  });

  it("009-E06: no pide ningún permiso: la usa también quien no tiene ninguno", () => {
    conPermisos();
    render(<Configuracion />);
    fireEvent.click(screen.getByTestId("cfg-animaciones"));
    expect(preferencias().animaciones).toBe(false);
    expect(screen.getByTestId("configuracion").textContent).toContain("esta computadora");
  });
});
