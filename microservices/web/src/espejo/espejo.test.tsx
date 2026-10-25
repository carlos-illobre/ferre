import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

// El espejo sobre la conexión entre los dos (specs/023): al encontrarse, cada lado le cuenta al
// otro lo que tiene, y las reglas de quién sigue a quién no cambian (decisiones 60 y 71).
const falso = vi.hoisted(() => ({ enlace: null as unknown as ReturnType<typeof import("../pruebas/enlace-falso")["crearEnlaceFalso"]> }));
vi.mock("../enlace", async () => { const { crearEnlaceFalso } = await import("../pruebas/enlace-falso"); falso.enlace = crearEnlaceFalso(); return falso.enlace.modulo; });

type Espejo = typeof import(".");
let espejo: Espejo;
beforeEach(async () => {
  vi.resetModules();
  espejo = await import(".");
  falso.enlace.olvidar();
});

// Una pantalla que espeja la venta y la parte en la que está.
function Pantalla({ venta, parte, alVenta, alIr }: { venta: unknown; parte: string | null; alVenta: (v: unknown) => void; alIr: (p: string) => void }) {
  espejo.useEspejar("venta", venta, alVenta);
  espejo.useEspejar<string | null>("ir", parte, (p) => p && alIr(p));
  return null;
}
const estadosMandados = () => falso.enlace.mandados.filter((m) => m.tipo === "estado");

describe("espejo por el enlace", () => {
  it("023-E16: al encontrarse, la computadora cuenta su parte y lo suyo; el celular toma la parte de la computadora", async () => {
    falso.enlace.ponerOtroEsta(false);
    const alIr = vi.fn();
    const { rerender } = render(<Pantalla venta={{ items: [] }} parte="vender" alVenta={() => {}} alIr={alIr} />);
    rerender(<Pantalla venta={{ items: [1] }} parte="vender" alVenta={() => {}} alIr={alIr} />);
    await act(async () => { await new Promise((r) => setTimeout(r, 200)); });
    act(() => falso.enlace.ponerOtroEsta(true));
    const [estado] = estadosMandados() as Array<{ docs: Record<string, { datos: unknown }> }>;
    expect(estado!.docs.venta!.datos).toEqual({ items: [1] });
    expect(falso.enlace.mandados).toContainEqual({ tipo: "espejo", cambio: "ir", datos: "vender" });
  });

  it("023-E16: de cada trabajo en curso queda el que cambió último; el que acaba de abrir no pisa al otro", async () => {
    falso.enlace.ponerLado("celular");
    falso.enlace.ponerOtroEsta(false);
    const alVenta = vi.fn();
    render(<Pantalla venta={{ items: [] }} parte={null} alVenta={alVenta} alIr={() => {}} />);
    act(() => falso.enlace.ponerOtroEsta(true));
    // La computadora tenía una venta a medio armar: el celular, recién abierto, la toma.
    act(() => falso.enlace.llega({ tipo: "estado", docs: { venta: { datos: { items: [7] }, haceMs: 60_000 } }, pausado: false }));
    expect(alVenta).toHaveBeenCalledWith({ items: [7] });
  });

  it("una venta más vieja que la de este lado no la pisa; si el otro estaba en pausa, quedan en pausa", async () => {
    falso.enlace.ponerOtroEsta(false);
    const alVenta = vi.fn();
    const { rerender } = render(<Pantalla venta={{ items: [] }} parte="vender" alVenta={alVenta} alIr={() => {}} />);
    rerender(<Pantalla venta={{ items: [1] }} parte="vender" alVenta={alVenta} alIr={() => {}} />);
    act(() => falso.enlace.ponerOtroEsta(true));
    act(() => falso.enlace.llega({ tipo: "estado", docs: { venta: { datos: { items: [9] }, haceMs: 3_600_000 } }, pausado: true }));
    expect(alVenta).not.toHaveBeenCalled();
    let pausado = false;
    function Ver() { pausado = espejo.useEspejo().pausado; return null; }
    render(<Ver />);
    expect(pausado).toBe(true);
  });

  it("023-E16: los cambios del otro llegan; los avisos se muestran; con el otro ausente no se manda nada", async () => {
    const alVenta = vi.fn();
    render(<Pantalla venta={{ items: [] }} parte="vender" alVenta={alVenta} alIr={() => {}} />);
    act(() => falso.enlace.llega({ tipo: "espejo", cambio: "venta", datos: { items: [3] } }));
    expect(alVenta).toHaveBeenCalledWith({ items: [3] });
    act(() => falso.enlace.llega({ tipo: "espejo", cambio: "cualquiera", datos: 1 }));
    const avisos: string[] = [];
    espejo.alAvisoDelEspejo((t) => avisos.push(t));
    act(() => falso.enlace.llega({ tipo: "aviso", texto: "Venta de $3.000 cobrada en el celular" }));
    expect(avisos).toEqual(["Venta de $3.000 cobrada en el celular"]);
    falso.enlace.ponerOtroEsta(false);
    const antes = falso.enlace.mandados.length;
    espejo.contarAlEspejo("nada");
    espejo.avisarAlEspejo("venta", { items: [4] });
    expect(falso.enlace.mandados.length).toBe(antes);
  });

  it("pausar se le cuenta al otro; al reanudar, la computadora vuelve a contar lo suyo", async () => {
    render(<Pantalla venta={{ items: [2] }} parte="vender" alVenta={() => {}} alIr={() => {}} />);
    act(() => espejo.pausarEspejo(true));
    expect(falso.enlace.mandados).toContainEqual({ tipo: "pausa", pausado: true });
    falso.enlace.mandados.length = 0;
    act(() => falso.enlace.llega({ tipo: "pausa", pausado: false }));
    expect(falso.enlace.mandados).toContainEqual({ tipo: "espejo", cambio: "ir", datos: "vender" });
  });
});
