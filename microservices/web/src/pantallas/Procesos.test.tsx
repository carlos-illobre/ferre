import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { conPermisos, conTodosLosPermisos, usuarioDePrueba } from "../pruebas/sesion";
import { puede } from "./permisos";
import { DE_MAS as DE_MAS_COMPU } from "./compu/marco/Mas";
import { DE_MAS as DE_MAS_CELU } from "./celular/App";
import { PantallaDeProcesos, pedirAProcesos } from "./comun/procesos/Procesos";

// El módulo se prueba en su paquete; acá solo importa qué le da Ferrebress.
vi.mock("procesos-web", () => ({
  Procesos: (p: { interfaz: string; puede: { ver: boolean; dibujar: boolean }; pantallas: string[] }) => <p data-testid="modulo">{JSON.stringify({ interfaz: p.interfaz, puede: p.puede, pantallas: p.pantallas.length })}</p>,
}));
vi.mock("procesos-web/estilos.css", () => ({}));

// Procesos en Ferrebress (ADR-019): la opción de Más y lo que se le pasa al módulo.
const enMasCompu = () => DE_MAS_COMPU.filter((d) => puede(usuarioDePrueba, ...(d.pide ?? []))).map((d) => d.ruta);
const enMasCelu = () => DE_MAS_CELU.filter((d) => puede(usuarioDePrueba, ...(d.pide ?? []))).map((d) => d.parte);

describe("Procesos en Más", () => {
  afterEach(() => conTodosLosPermisos());

  it("011-E37 sin «Ver procesos» ni «Dibujar procesos», Más no ofrece Procesos, ni en la computadora ni en el celular", () => {
    conPermisos("ventas.registrar");
    expect(enMasCompu()).not.toContain("procesos");
    expect(enMasCelu()).not.toContain("procesos");
  });

  it("011-E37 011-E45 con cualquiera de los dos, Más ofrece Procesos en las dos interfaces", () => {
    for (const permiso of ["procesos.ver", "procesos.dibujar"] as const) {
      conPermisos(permiso);
      expect(enMasCompu()).toContain("procesos");
      expect(enMasCelu()).toContain("procesos");
    }
  });

  it("011-E38 al módulo le llega qué puede quien lo usa", async () => {
    conPermisos("procesos.ver");
    render(<PantallaDeProcesos interfaz="compu" />);
    expect(JSON.parse((await screen.findByTestId("modulo")).textContent!)).toEqual({ interfaz: "compu", puede: { ver: true, dibujar: false }, pantallas: 16 });
  });
});

describe("pedir a Procesos", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("011-E41 un 409 conserva lo que mandó el servidor: cómo quedó el proceso", async () => {
    vi.stubGlobal("fetch", async () => Response.json({ error: "Alguien cambió este proceso", proceso: { revision: 7 } }, { status: 409 }));
    const error = await pedirAProcesos("/procesos/p1/borrador", { method: "PUT", body: "{}" }).catch((e: unknown) => e);
    expect(error).toMatchObject({ estado: 409, message: "Alguien cambió este proceso", datos: { proceso: { revision: 7 } } });
  });

  it("011-E42 sin conexión, el error tiene estado 0", async () => {
    vi.stubGlobal("fetch", async () => { throw new TypeError("Failed to fetch"); });
    await expect(pedirAProcesos("/procesos")).rejects.toMatchObject({ estado: 0, message: "Sin conexión" });
  });
});
