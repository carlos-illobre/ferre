/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));

import { conPermisos, conTodosLosPermisos } from "../pruebas/sesion";
import { consultas } from "../consultas";
import { PIDE_EL_NEGOCIO, SECCIONES_DE_NEGOCIO } from "./pestanas-de-negocio";
import { DE_MAS as DE_MAS_COMPU, Mas } from "./compu/Mas";
import { DE_MAS as DE_MAS_CELULAR } from "./celular/App";
import { ComoVaElNegocio } from "./celular/ComoVaElNegocio";
import { ResumenCompras, ResumenInventario, ResumenVentas } from "./compu/base/pantallas/Resumen";
import { DineroInvertido } from "./DineroInvertido";
import { ComprasRecientes } from "./compu/ComprasRecientes";

const hoy = new Date().toISOString();
const RESPUESTAS: Record<string, unknown> = {
  "/ventas": { total: 293000, totales: { efectivo: 12000, mercado_pago: 223000, cuenta_corriente: 58000 }, ventas: [{ id: "v1", fecha: hoy, medio_pago: "efectivo", total: "293000", estado: "confirmada", cliente: null, items: [] }, { id: "v2", fecha: hoy, medio_pago: "efectivo", total: "1000", estado: "anulada", cliente: null, items: [] }] },
  "/consultas": [{ id: "c1", fecha: hoy, descripcion: "Disco de corte 115 mm", precio_ofrecido: "3200", motivo: null }],
  "/compras/semana": { desde: "2026-10-09", por_proveedor: [{ proveedor: "Tresge", compras: "1", total: "126900" }], total: 126900 },
  "/compras": [{ id: "k1", fecha: hoy, proveedor: "Erpa", total: "47600", comprobante: "factura", numero: null, renglones: 4, estado: "confirmada", foto: null, usuario: "Carlos" }],
  "/stock": { productos: [], valor_total: 854848, por_proveedor: { Tresge: { unidades: 4, valor: 362040, productos: 4 } } },
};

// Los datos del servidor viven en un caché de toda la app: cada prueba arranca sin nada.
const conDatos = (pantalla: ReactNode) => render(<>{pantalla}</>);

// Cómo va el negocio en tres secciones, cada una con su permiso (decisión 89, 012).
describe("Más → Cómo va el negocio", () => {
  beforeEach(() => {
    conTodosLosPermisos();
    consultas.clear();
    location.hash = "";
    apiFalsa.mockReset();
    apiFalsa.mockImplementation(async (ruta: string) => RESPUESTAS[ruta.split("?")[0]!] ?? []);
    globalThis.fetch = vi.fn(async () => ({ json: async () => ({ ok: true, db: "ok" }) })) as never;
  });

  it("012-E11 las secciones son Ventas, Compras e Inventario, en ese orden, cada una con su permiso", () => {
    expect(SECCIONES_DE_NEGOCIO.map((s) => [s.nombre, s.pide])).toEqual([
      ["Ventas", ["negocio.ventas"]], ["Compras", ["negocio.gastos", "deposito.compras"]], ["Inventario", ["negocio.invertido"]],
    ]);
  });

  it("012-E05 la opción de Más pide alguno de los permisos de la pantalla, en las dos interfaces", () => {
    expect(DE_MAS_COMPU.find((d) => d.ruta === "resumen")!.pide).toEqual(PIDE_EL_NEGOCIO);
    expect(DE_MAS_CELULAR.find((d) => d.parte === "negocio")!.pide).toEqual(PIDE_EL_NEGOCIO);
    expect(PIDE_EL_NEGOCIO).toEqual(["negocio.ventas", "negocio.gastos", "deposito.compras", "negocio.invertido"]);
  });

  it("012-E12 en la computadora, la opción de Más lleva a la sección que se le indique", () => {
    render(<Mas atajoDe={() => null} opciones={DE_MAS_COMPU.filter((d) => d.ruta === "resumen").map((d) => ({ ...d, destino: "gastos" }))} />);
    fireEvent.click(screen.getByTestId("mas-resumen"));
    expect(location.hash).toBe("#/gastos");
  });

  describe("en la computadora", () => {
    it("012-E01 Ventas: lo vendido, la cantidad de ventas y lo que no llevaron, sin los gastos", async () => {
      conDatos(<ResumenVentas />);
      await waitFor(() => expect(screen.getByTestId("indicador-vendido").textContent).toContain("$293.000"));
      expect(screen.getByTestId("indicador-ventas").textContent).toContain("1 anulada");
      expect(screen.getByTestId("indicador-consultas").textContent).toContain("1");
      expect(await screen.findByText("Disco de corte 115 mm")).toBeTruthy();
      expect(screen.queryByTestId("indicador-gastos")).toBeNull();
      expect(apiFalsa.mock.calls.map(([r]) => r)).not.toContain("/compras/semana");
    });

    it("012-E15 «Actualizar», con su ícono, vuelve a traer los números de la sección", async () => {
      conDatos(<ResumenVentas />);
      await waitFor(() => expect(screen.getByTestId("indicador-vendido").textContent).toContain("$293.000"));
      const antes = apiFalsa.mock.calls.filter(([r]) => r === "/ventas").length;
      const boton = screen.getByTestId("actualizar-negocio");
      expect(boton.querySelector("svg")).toBeTruthy();
      fireEvent.click(boton);
      await waitFor(() => expect(apiFalsa.mock.calls.filter(([r]) => r === "/ventas").length).toBeGreaterThan(antes));
    });

    it("012-E02 Compras con «Ver los gastos» solo: los gastos, sin las compras recientes", async () => {
      conPermisos("negocio.gastos");
      conDatos(<ResumenCompras recientes={(v) => <ComprasRecientes key={v} />} />);
      await waitFor(() => expect(screen.getByTestId("indicador-gastos").textContent).toContain("$126.900"));
      expect(screen.getByTestId("gastos-semana").textContent).toContain("Tresge");
      expect(screen.queryByTestId("compras-recientes")).toBeNull();
    });

    it("012-E03 Compras con «Ver las compras» solo: las compras recientes, sin los gastos", async () => {
      conPermisos("deposito.compras");
      conDatos(<ResumenCompras recientes={(v) => <ComprasRecientes key={v} />} />);
      expect(await screen.findByTestId("compras-recientes")).toBeTruthy();
      expect(screen.queryByTestId("gastos-semana")).toBeNull();
      expect(apiFalsa.mock.calls.map(([r]) => r)).not.toContain("/compras/semana");
    });

    it("012-E16 Compras con los dos permisos: los gastos y las compras recientes", async () => {
      conPermisos("negocio.gastos", "deposito.compras");
      conDatos(<ResumenCompras recientes={(v) => <ComprasRecientes key={v} />} />);
      expect(await screen.findByTestId("compras-recientes")).toBeTruthy();
      expect(await screen.findByTestId("gastos-semana")).toBeTruthy();
    });

    it("012-E04 Inventario: el dinero invertido, sin números de ventas ni de gastos", async () => {
      conPermisos("negocio.invertido");
      conDatos(<ResumenInventario invertido={(v) => <DineroInvertido key={v} />} />);
      await waitFor(() => expect(screen.getByTestId("dinero-invertido-total").textContent).toContain("854.848"));
      expect(screen.queryByTestId("indicador-vendido")).toBeNull();
      expect(screen.queryByTestId("indicador-gastos")).toBeNull();
    });
  });

  describe("en el celular", () => {
    it("012-E11 con todo, las tres pestañas en orden; tocar una lleva a su dirección", async () => {
      conDatos(<ComoVaElNegocio seccion="ventas" />);
      expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Ventas", "Compras", "Inventario"]);
      fireEvent.click(screen.getByRole("tab", { name: "Inventario" }));
      expect(location.hash).toBe("#/mas/invertido");
    });

    it("012-E12 sin «Ver las ventas del negocio», el submenú tiene solo Compras e Inventario", () => {
      conPermisos("negocio.gastos", "negocio.invertido");
      conDatos(<ComoVaElNegocio seccion="compras" />);
      expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Compras", "Inventario"]);
    });

    it("012-E13 con una sola sección, el título y sin submenú", () => {
      conPermisos("negocio.ventas");
      conDatos(<ComoVaElNegocio seccion="ventas" />);
      expect(screen.getByRole("heading", { name: "Cómo va el negocio" })).toBeTruthy();
      expect(screen.queryAllByRole("tab")).toHaveLength(0);
    });

    it("012-E01 Ventas: lo vendido, por medio de pago y lo que no llevaron, sin los gastos", async () => {
      conPermisos("negocio.ventas");
      conDatos(<ComoVaElNegocio seccion="ventas" />);
      await waitFor(() => expect(screen.getByTestId("numero-vendido").textContent).toContain("$293.000"));
      expect(screen.getByTestId("resumen-hoy").textContent).toContain("Mercado Pago");
      expect(await screen.findByText("Disco de corte 115 mm")).toBeTruthy();
      expect(screen.queryByTestId("gastos-semana")).toBeNull();
    });

    it("012-E02 y E03 Compras muestra lo que cada permiso deja", async () => {
      conPermisos("negocio.gastos");
      const { unmount } = conDatos(<ComoVaElNegocio seccion="compras" />);
      await waitFor(() => expect(screen.getByTestId("numero-gastos").textContent).toContain("$126.900"));
      expect(screen.queryByTestId("compras-recientes")).toBeNull();
      unmount();
      conPermisos("deposito.compras");
      conDatos(<ComoVaElNegocio seccion="compras" />);
      expect(await screen.findByTestId("compras-recientes")).toBeTruthy();
      expect(screen.queryByTestId("gastos-semana")).toBeNull();
    });

    it("012-E04 Inventario: el dinero invertido", async () => {
      conPermisos("negocio.invertido");
      conDatos(<ComoVaElNegocio seccion="inventario" />);
      await waitFor(() => expect(screen.getByTestId("dinero-invertido-total").textContent).toContain("854.848"));
      expect(screen.queryByTestId("numero-vendido")).toBeNull();
    });
  });
});
