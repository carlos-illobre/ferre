/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { Anotadas as Anomalias } from "./compu/base/pantallas/Anomalias";

const una = { id: "a1", tipo: "venta_sin_stock", cantidad: "3", detalle: "Se vendieron 3 y el sistema tenía 0 en stock: faltaban 3", creado_en: "2026-10-11T15:30:00Z", producto: "MECHA 8 MM", unidad: "unidad", usuario: "Marta" };

// Anomalías (RF-59): el registro, a modo de auditoría, de las diferencias entre el sistema y la realidad.
describe("Anomalías", () => {
  beforeEach(() => { apiFalsa.mockReset(); });

  it("lista cada anomalía con su día, hora, producto y qué pasó", async () => {
    apiFalsa.mockResolvedValue({ pagina: 1, hay_mas: false, anomalias: [una] });
    render(<Anomalias />);
    const fila = await screen.findByTestId("anomalia");
    // Como la v2 (021): la fila lleva la hora; el día y quién, en el detalle del producto.
    expect(fila.textContent).toContain("15:30");
    expect(fila.textContent).toContain("Mecha 8 mm");
    expect(fila.textContent).toContain("Venta sin stock");
    expect(screen.getByTestId("lista-de-anomalias").textContent).toContain("11/10");
    fireEvent.click(fila);
    expect(document.body.textContent).toContain("Marta");
    expect(document.body.textContent).toContain("faltaban 3");
  });

  it("sin anomalías lo dice, y de a páginas se va a las más viejas", async () => {
    apiFalsa.mockResolvedValueOnce({ pagina: 1, hay_mas: true, anomalias: [una] }).mockResolvedValueOnce({ pagina: 2, hay_mas: false, anomalias: [] });
    render(<Anomalias />);
    fireEvent.click(await screen.findByRole("button", { name: "Más viejas" }));
    expect(await screen.findByText("No hay más anomalías.")).toBeTruthy();
    expect(apiFalsa).toHaveBeenLastCalledWith("/anomalias?pagina=2");
  });

  it("sin conexión avisa y deja reintentar", async () => {
    apiFalsa.mockRejectedValue(new Error("Failed to fetch"));
    render(<Anomalias />);
    expect((await screen.findByRole("alert")).textContent).toContain("Sin conexión");
  });
});
