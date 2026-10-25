/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { consultas } from "../../../datos/conexion";
import { Duplicados } from "./Duplicados";

const UNION = { absorbido_id: "d-9", absorbido: "LLAVE FRANCESA 10\" BAHCO", conservado_id: "p-9", conservado: "Llave francesa 10 pulgadas", marca: "Bahco", foto_url: null, unido_en: "2026-10-14T10:00:00Z", proveedores: "Comodo, Dimetal" };

// 002-T007: separar no pide confirmar; el aviso trae «Deshacer», que los vuelve a unir.
describe("separar en Duplicados, en el celular", () => {
  beforeEach(() => {
    consultas.clear();
    apiFalsa.mockReset().mockImplementation(async (ruta: string) => (ruta === "/equivalencias/unidos" ? [UNION] : ruta === "/equivalencias" ? [] : {}));
  });

  it("separa sin preguntar y «Deshacer» los vuelve a unir", async () => {
    const confirmar = vi.spyOn(window, "confirm");
    render(<Duplicados />);
    const union = await screen.findByTestId("union");
    fireEvent.click(within(union).getByRole("button", { name: /Separar/ }));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/equivalencias/separar", { method: "POST", body: JSON.stringify({ absorbido_id: "d-9" }) }));
    expect(confirmar).not.toHaveBeenCalled();
    const aviso = await screen.findByTestId("mensaje-separar");
    expect(aviso.textContent).toContain("Separados: «LLAVE FRANCESA 10\" BAHCO» vuelve a ser un producto aparte");
    fireEvent.click(within(aviso).getByRole("button", { name: "Deshacer" }));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/equivalencias/unir", { method: "POST", body: JSON.stringify({ conservar_id: "p-9", absorber_id: "d-9" }) }));
    expect((await screen.findByTestId("mensaje-separar")).textContent).toContain("Separación deshecha");
  });
});
