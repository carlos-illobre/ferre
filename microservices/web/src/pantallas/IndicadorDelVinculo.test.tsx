import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// El indicador de la conexión entre el celular y la computadora (specs/023, variante A).
const falso = vi.hoisted(() => ({ enlace: null as unknown as ReturnType<typeof import("../pruebas/enlace-falso")["crearEnlaceFalso"]> }));
vi.mock("../enlace", async () => { const { crearEnlaceFalso } = await import("../pruebas/enlace-falso"); falso.enlace = crearEnlaceFalso(); return falso.enlace.modulo; });
import { IndicadorDelVinculo } from "./IndicadorDelVinculo";

beforeEach(() => falso.enlace.olvidar());
const estado = () => screen.getByTestId("espejo-estado");

describe("indicador del vínculo", () => {
  it("023-E11: cada estado con su color y su texto, en la computadora y en el celular", () => {
    const { rerender } = render(<IndicadorDelVinculo />);
    const casos = [
      ["directa", "Directa"], ["servidor", "Por el servidor"], ["conectando", "Conectando…"], ["solo", "El celular no está abierto"], ["sin-conexion", "Sin conexión"],
    ] as const;
    for (const [conexion, texto] of casos) {
      act(() => falso.enlace.ponerEstado({ conexion }));
      expect(estado().textContent).toBe(texto);
      expect(estado().dataset.conexion).toBe(conexion);
      expect(screen.getByTestId("indicador-vinculo").querySelector(`.iv-punto.${conexion}`)).toBeTruthy();
    }
    falso.enlace.ponerLado("celular");
    act(() => falso.enlace.ponerEstado({ conexion: "solo" }));
    rerender(<IndicadorDelVinculo celular />);
    expect(estado().textContent).toBe("La compu no está abierta");
  });

  it("023-E12 023-E22: al tocarlo muestra el detalle, el porqué del servidor y «Probar conexión directa»; Escape lo cierra", () => {
    render(<IndicadorDelVinculo />);
    act(() => falso.enlace.ponerEstado({ conexion: "servidor", motivo: "red", probadaEn: Date.now(), demoraMs: 180, desde: Date.now() }));
    fireEvent.click(screen.getByTestId("indicador-vinculo"));
    const detalle = screen.getByTestId("detalle-del-vinculo");
    expect(detalle.textContent).toContain("Tu celular");
    expect(detalle.textContent).toContain("Por el servidor de Ferrebress");
    expect(detalle.textContent).toContain("180 ms ida y vuelta");
    expect(screen.getByTestId("por-que-servidor").textContent).toMatch(/La red del local no deja conectar directo.*Se probó hoy a las/);
    fireEvent.click(screen.getByTestId("probar-directa"));
    expect(falso.enlace.probadas()).toBe(1);
    fireEvent.keyDown(detalle, { key: "Escape" });
    expect(screen.queryByTestId("detalle-del-vinculo")).toBeNull();
  });

  it("con la directa no ofrece probar; en pausa lo dice y ofrece «Reconectar» (023-E13)", () => {
    render(<IndicadorDelVinculo />);
    act(() => falso.enlace.ponerEstado({ conexion: "directa" }));
    fireEvent.click(screen.getByTestId("indicador-vinculo"));
    expect(screen.queryByTestId("probar-directa")).toBeNull();
    fireEvent.click(screen.getByTestId("desconectar-arriba"));
    expect(falso.enlace.mandados).toContainEqual({ tipo: "pausa", pausado: true });
    expect(estado().textContent).toBe("En pausa");
    expect(screen.getByTestId("reconectar-arriba")).toBeTruthy();
  });

  it("023-E14: sin vínculo no hay puntito", () => {
    falso.enlace.ponerVinculado(false);
    render(<IndicadorDelVinculo />);
    expect(screen.queryByTestId("indicador-vinculo")).toBeNull();
  });
});
