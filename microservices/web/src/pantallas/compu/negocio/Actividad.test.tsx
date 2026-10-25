import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// «Quién hizo qué» muestra lo que manda cada servicio, sin conocer sus tipos (specs/027).
const EVENTO = {
  id: "e1", servicio: "turnos", tipo: "turno.dado", fecha: "2026-10-24T13:00:00Z", dispositivo: "Celular de Ana", quien: { id: "u1", nombre: "Carlos Pérez" },
  titulo: "Turno dado", detalle: "Martes 10 h · Cliente nuevo", grupo: "Turnos", importancia: "revisar", referencias: [], contenido: { hora: "10" },
};
const respuesta = vi.hoisted(() => ({ actual: {} as { datos: unknown; error: unknown } }));
vi.mock("../../../negocio/actividad", async (original) => ({
  ...(await original<typeof import("../../../negocio/actividad")>()),
  useActividad: () => ({ ...respuesta.actual, cargando: false }), useGrupos: () => ["Turnos", "Ventas"], paginasDe: () => 1,
}));
vi.mock("../../../negocio/usuarios", () => ({ useUsuarios: () => ({ datos: [] }) }));
import { ErrorApi } from "../../../datos/conexion";
import { Actividad } from "./Actividad";

describe("«Quién hizo qué»", () => {
  beforeEach(() => { respuesta.actual = { datos: { eventos: [EVENTO], total: 1, pagina: 1, por_pagina: 10 }, error: null }; });

  it("027-E12: la acción de un servicio que la web no conoce se ve con su título, su detalle y su importancia, y su grupo se puede filtrar", () => {
    render(<Actividad />);
    const evento = screen.getByTestId("evento");
    expect(evento.textContent).toContain("Turno dado");
    expect(evento.textContent).toContain("Martes 10 h · Cliente nuevo");
    expect(evento.textContent).toContain("Carlos");
    expect(evento.querySelector(".urgente")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Turnos" })).toBeTruthy();
  });

  it("027-E04: sin Auditoría, dice que no está disponible", () => {
    respuesta.actual = { datos: null, error: new ErrorApi(502, "Quién hizo qué no está disponible ahora. Probá de nuevo en un rato") };
    render(<Actividad />);
    expect(document.body.textContent).toContain("Quién hizo qué no está disponible ahora");
  });
});
