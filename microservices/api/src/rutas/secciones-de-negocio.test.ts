import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";
import { PERMISOS } from "../permisos.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

// Cómo va el negocio en tres secciones, cada una con su permiso de lectura (decisión 95): el
// servidor no entrega lo que el permiso no deja ver.
describe("secciones de Cómo va el negocio", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    base.actual.programar(/WITH movimientos AS/, { rows: [{ id: "p1", stock: "4", costo_neto: "1000", proveedor: "Tresge", valor: "4000", ultimo_movimiento: null }] });
  });

  it("013-E06 cada dato de la pantalla pide el permiso de su sección", async () => {
    const estados = async (rol: "veVentas" | "veGastos" | "veInvertido") => [
      (await pedir(app, "GET", "/ventas", { rol })).status,
      (await pedir(app, "GET", "/consultas", { rol })).status,
      (await pedir(app, "GET", "/compras/semana", { rol })).status,
    ];
    expect(await estados("veVentas")).toEqual([200, 200, 403]);
    expect(await estados("veGastos")).toEqual([403, 403, 200]);
    expect(await estados("veInvertido")).toEqual([403, 403, 403]);
  });

  it("013-E09 sin «Ver el dinero invertido», el stock llega sin valor en pesos", async () => {
    const r = (await (await pedir(app, "GET", "/stock", { rol: "veVentas" })).json()) as { productos: { stock: string; valor: string; costo_neto: unknown }[]; valor_total: number; por_proveedor: object };
    expect(r.productos[0]).toMatchObject({ stock: "4", valor: "0", costo_neto: null });
    expect(r.valor_total).toBe(0);
    expect(r.por_proveedor).toEqual({});
  });

  it("013-E10 con «Ver el dinero invertido», el stock llega con su valor", async () => {
    const r = (await (await pedir(app, "GET", "/stock", { rol: "veInvertido" })).json()) as { valor_total: number; por_proveedor: Record<string, { valor: number }> };
    expect(r.valor_total).toBe(4000);
    expect(r.por_proveedor.Tresge?.valor).toBe(4000);
  });

  it("013-E08 «Ver los números del negocio» ya no está; los tres nuevos, en Negocio", () => {
    const claves = PERMISOS.map((p) => p.clave as string);
    expect(claves).not.toContain("negocio.numeros");
    expect(PERMISOS.filter((p) => ["negocio.ventas", "negocio.gastos", "negocio.invertido"].includes(p.clave)).map((p) => [p.parte, p.nombre]))
      .toEqual([["Negocio", "Ver las ventas del negocio"], ["Negocio", "Ver los gastos"], ["Negocio", "Ver el dinero invertido"]]);
  });

  it("013-E18 a un rol no se le puede dar «Ver los números del negocio»", async () => {
    const r = await pedir(app, "POST", "/roles", { rol: "admin", cuerpo: { nombre: "Viejo", permisos: ["negocio.numeros"] } });
    expect(r.status).toBe(400);
  });
});
