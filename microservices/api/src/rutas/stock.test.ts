import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

// Corregir un stock a mano (RF-53): cuántas hay y por qué. El motivo es obligatorio para
// cualquier interfaz, por eso lo exige el servidor.
describe("POST /stock/:producto/ajustes", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/SUM\(cantidad\), 0\) as "stock"/, { rows: [{ stock: "17" }] }); });

  it("sin motivo no se guarda", async () => {
    for (const motivo of [undefined, "", "   "]) {
      const r = await pedir(app, "POST", "/stock/p1/ajustes", { rol: "mostrador", cuerpo: { cantidad_real: 15, motivo } });
      expect(r.status).toBe(400);
      expect(((await r.json()) as { error: string }).error).toContain("Falta el motivo");
    }
    expect(base.actual.sqlDe(/insert into "movimiento_stock"/)).toHaveLength(0);
  });

  it("con motivo registra la diferencia y deja la explicación", async () => {
    const r = await pedir(app, "POST", "/stock/p1/ajustes", { rol: "mostrador", cuerpo: { cantidad_real: 15, motivo: "Rotura" } });
    expect(r.status).toBeLessThan(300);
    const movimiento = base.actual.sqlDe(/insert into "movimiento_stock"/)[0]!;
    expect(movimiento.params).toContain(-2);
    expect(movimiento.params).toContain("había 17, hay 15: Rotura");
  });

  it("una cantidad que no es un número mayor o igual a cero se rechaza", async () => {
    expect((await pedir(app, "POST", "/stock/p1/ajustes", { cuerpo: { cantidad_real: -1, motivo: "x" } })).status).toBe(400);
  });
});

// La descarga a mano (specs/018, historia 5): el stock que cambió desde la marca anterior.
describe("GET /stock/cambios", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    base.actual.programar(/pg_snapshot_xmin/, { rows: [{ marca: "150" }] });
    base.actual.programar(/FROM movimiento_stock/, { rows: [{ producto_id: "p1", stock: "7" }] });
  });

  it("018-E25: con marca, solo el de los productos que se movieron desde entonces, y la marca nueva", async () => {
    const r = await pedir(app, "GET", "/stock/cambios?marca=120", { rol: "mostrador" });
    expect(await r.json()).toEqual({ marca: "150", stock: { p1: "7" } });
    const consulta = base.actual.sqlDe(/FROM movimiento_stock/).at(-1)!;
    expect(consulta.sql).toMatch(/transaccion >= \$1::xid8/);
    expect(consulta.params).toEqual(["120"]);
  });

  it("018-E24: sin marca (o con una rara, o una que no entra en un xid8), el de todos los que tienen movimientos", async () => {
    expect((await pedir(app, "GET", "/stock/cambios?marca=99999999999999999999", { rol: "mostrador" })).status).toBe(200);
    expect(base.actual.sqlDe(/FROM movimiento_stock/).at(-1)!.sql).not.toMatch(/transaccion/);
    await pedir(app, "GET", "/stock/cambios?marca=1;DROP", { rol: "mostrador" });
    expect(base.actual.sqlDe(/FROM movimiento_stock/).at(-1)!.sql).not.toMatch(/transaccion/);
    expect((await pedir(app, "GET", "/stock/cambios", { rol: null })).status).toBe(401);
  });
});

// El inventario toma el costo de la copia del catálogo; de la base, solo el stock (specs/018, revisión 1.6).
describe("GET /stock", () => {
  beforeEach(async () => {
    base.actual = baseFalsa();
    base.actual.programar(/FROM movimiento_stock GROUP BY producto_id/, { rows: [{ id: "p1", stock: "3", ultimo_movimiento: null }, { id: "unido", stock: "5", ultimo_movimiento: null }] });
    const { cargarParaPrueba } = await import("../productos/copia.js");
    cargarParaPrueba([{ id: "p1", descripcion: "P1", costo_neto: "1000", proveedor: "Tresge" }, { id: "unido", descripcion: "Unido", costo_neto: "10", vigente: false }]);
  });

  it("no lee productos ni costos de la base; los que ya no están a la venta no van", async () => {
    const r = await (await pedir(app, "GET", "/stock", { rol: "dueño" })).json() as { productos: { id: string; valor: string; proveedor: string }[]; valor_total: number };
    expect(r.productos).toEqual([expect.objectContaining({ id: "p1", valor: "3000.00", proveedor: "Tresge" })]);
    expect(r.valor_total).toBe(3000);
    expect(base.actual.sqlDe(/FROM producto|precio_proveedor/)).toHaveLength(0);
  });
});

