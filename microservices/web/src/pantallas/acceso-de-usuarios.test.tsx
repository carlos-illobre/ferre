/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../credenciales", () => ({ hayHuella: () => false, listarCredenciales: async () => [{ id: "mio", dispositivo: "Motorola del depósito", creada_en: "2026-06-02T10:00:00Z", ultimo_uso_en: null }], quitarCredencial: vi.fn(), vincularEsteDispositivo: vi.fn(), EVENTO_CREDENCIALES: "x" }));
const espejo = vi.hoisted(() => ({ emparejado: false }));
vi.mock("../espejo", async (original) => ({ ...(await original<typeof import("../espejo")>()), useEspejo: () => ({ emparejado: espejo.emparejado, lado: "celular", conectado: true, otroPresente: true, pausado: false, enEspejo: true }) }));

import { conTodosLosPermisos } from "../pruebas/sesion";
import { Usuarios } from "./compu/base/pantallas/Usuarios";
import { Configuracion } from "./Configuracion";
import { MisCelulares } from "./celular/MisCelulares";
import { VinculoPropio } from "./Vinculo";

const MARTA = { id: "m1", email: "marta@ferre.test", nombre: "Marta", activo: true, roles: [{ id: "r1", nombre: "Vendedor" }] };
const NICO = { id: "n1", email: "nico@ferre.test", nombre: "Nicolás", activo: true, roles: [{ id: "r1", nombre: "Vendedor" }] };

// 007-T037 y 009-T006: sin pestaña Sesiones (decisiones 99 y 100).
describe("las sesiones y los celulares de cada persona, en Usuarios", () => {
  beforeEach(() => {
    conTodosLosPermisos();
    apiFalsa.mockReset().mockImplementation(async (ruta: string) => {
      if (ruta === "/usuarios") return [MARTA, NICO];
      if (ruta === "/sesiones") return [{ id: "s1", usuario_id: "m1", dispositivo: "computadora · Firefox", ultimo_uso_en: new Date().toISOString(), email: MARTA.email, nombre: "Marta" }];
      if (ruta === "/credenciales/de-otros") return [{ id: "c1", usuario_id: "m1", dispositivo: "Samsung de Marta", creada_en: "2026-09-01T10:00:00Z", ultimo_uso_en: null }];
      if (ruta === "/puestos/configuracion") return { dias: 30 };
      return [];
    });
  });

  it("en la computadora, la columna «Acceso» dice cuánto tiene cada uno y despliega debajo de la fila sus sesiones y celulares", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Usuarios />);
    const linea = await screen.findByRole("button", { name: /Sesiones y celulares de Marta/ });
    expect(linea.textContent).toBe("1 sesión · 1 huella");
    const nico = screen.getAllByTestId("usuario-fila").find((f) => f.textContent?.includes("Nicolás"))!;
    expect(within(nico).queryByTestId("acceso-de-usuario")).toBeNull();
    fireEvent.click(linea);
    const lista = screen.getByTestId("lista-de-acceso");
    expect(lista.textContent).toContain("computadora · Firefox");
    expect(lista.textContent).toContain("Samsung de Marta");
    fireEvent.click(within(lista).getByRole("button", { name: "Cerrar la sesión de Marta en computadora · Firefox" }));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/sesiones/s1", { method: "DELETE" }));
    fireEvent.click(within(lista).getByRole("button", { name: /Quitar el celular Samsung de Marta/ }));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/credenciales/c1", { method: "DELETE" }));
    // Al final, cuántos días dura el vínculo.
    expect(((await screen.findByTestId("dias-vinculo")) as HTMLInputElement).value).toBe("30");
  });
});

describe("lo propio, en Configuración", () => {
  beforeEach(() => { conTodosLosPermisos(); apiFalsa.mockReset().mockResolvedValue([]); espejo.emparejado = false; });

  it("debajo de las preferencias, mis celulares con huella; el vínculo, solo si está vinculado, con «Desvincular» y sin los días", async () => {
    const { unmount } = render(<Configuracion celular propio={<><MisCelulares /><VinculoPropio /></>} />);
    expect(await screen.findByText("Motorola del depósito")).toBeTruthy();
    expect(screen.queryByTestId("vinculo")).toBeNull();
    unmount();
    espejo.emparejado = true;
    render(<Configuracion celular propio={<><MisCelulares /><VinculoPropio /></>} />);
    expect(screen.getByTestId("vinculo-actual").textContent).toContain("Este celular está vinculado con tu computadora.");
    expect(screen.getByTestId("desvincular-vinculo")).toBeTruthy();
    expect(screen.queryByTestId("dias-vinculo")).toBeNull();
  });
});
