import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// «Quién hizo qué» dice con palabras del mostrador un cambio en los ajustes del sistema (specs/020, E14).
const EVENTO = { id: "e1", tipo: "sistema.ajustes_cambiados", fecha: "2026-10-24T13:00:00Z", dispositivo_id: null, email: "carlos@ferre.test", nombre: "Carlos", contenido: { antes: { sesion_segundos: 60, vinculo_dias: 30 }, despues: { sesion_segundos: 300, vinculo_dias: 45 } } };
vi.mock("../../../negocio/actividad", async (original) => ({ ...(await original<typeof import("../../../negocio/actividad")>()), useActividad: () => ({ datos: { eventos: [EVENTO], total: 1, pagina: 1, por_pagina: 50 }, cargando: false, error: null }), paginasDe: () => 1 }));
vi.mock("../../../negocio/usuarios", () => ({ useUsuarios: () => ({ datos: [] }) }));
import { Actividad } from "./Actividad";

describe("«Quién hizo qué»", () => {
  it("020-E14: un cambio de ajustes dice qué ajuste, de cuánto a cuánto, y se puede filtrar", () => {
    render(<Actividad />);
    const evento = screen.getByTestId("evento").textContent!;
    expect(evento).toContain("Cambio en los ajustes del sistema");
    expect(evento).toContain("Sesión recordada: de 1 min a 5 min");
    expect(evento).toContain("Días del vínculo: de 30 a 45");
    expect(screen.getByRole("option", { name: "Ajustes del sistema" })).toBeTruthy();
  });
});
