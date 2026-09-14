import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "./pruebas/base-falsa.js";
import { separarProductos, unirProductos, type Movidos } from "./equivalencias.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("./pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("./db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("./app.js");

type Cliente = Parameters<typeof unirProductos>[0];

// Unir mueve todo lo del absorbido al conservado y anota exactamente qué movió; separar
// usa ese registro para devolver cada cosa a su lugar.
describe("unir y separar productos", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    base.actual.programar(/SELECT id, codigo_barras, marca, sector_id, margen_elegido, proveedor_preferido_id FROM producto WHERE id IN/, { rows: [
      { id: "A", codigo_barras: null, marca: "M", sector_id: null, margen_elegido: 100, proveedor_preferido_id: "prov-a" },
      { id: "B", codigo_barras: "779", marca: null, sector_id: "s1", margen_elegido: 50, proveedor_preferido_id: "prov-b" },
    ] });
    base.actual.programar(/UPDATE precio_proveedor SET producto_id = \$1 WHERE producto_id = \$2 RETURNING id/, { rows: [{ id: "pp1" }, { id: "pp2" }] });
    base.actual.programar(/UPDATE item_venta SET producto_id = \$1 WHERE producto_id = \$2 RETURNING id/, { rows: [{ id: "iv1" }] });
    base.actual.programar(/DELETE FROM renglon_conteo r .* RETURNING \*/, { rows: [{ id: "rc-dup", conteo_id: "c1", producto_id: "B", cantidad_contada: "3" }] });
  });

  it("unir devuelve lo movido y lo que tenía cada producto antes", async () => {
    const registro = await unirProductos(base.actual.pool as unknown as Cliente, "A", "B");
    expect(registro.movidos.precio_proveedor).toEqual(["pp1", "pp2"]);
    expect(registro.movidos.item_venta).toEqual(["iv1"]);
    expect(registro.movidos.movimiento_stock).toEqual([]);
    expect(registro.renglones_borrados).toEqual([{ id: "rc-dup", conteo_id: "c1", producto_id: "B", cantidad_contada: "3" }]);
    expect(registro.conservado_antes).toEqual({ codigo_barras: null, marca: "M", sector_id: null, margen_elegido: 100, proveedor_preferido_id: "prov-a" });
    expect(registro.absorbido_antes).toEqual({ proveedor_preferido_id: "prov-b" });
    expect(base.actual.sqlDe(/UPDATE producto SET activo = false, reemplazado_por/)[0]!.params).toEqual(["A", "B"]);
    // el conservado hereda lo que le faltaba (código de barras, sector)
    expect(base.actual.sqlDe(/COALESCE\(c\.codigo_barras, a\.codigo_barras\)/)).toHaveLength(1);
  });

  it("separar devuelve cada fila movida, reinserta los renglones borrados, restaura los productos y reactiva el absorbido", async () => {
    const registro: Movidos = {
      movidos: { precio_proveedor: ["pp1", "pp2"], item_venta: ["iv1"], item_compra: [], movimiento_stock: ["ms1"], consulta: [], renglon_conteo: [] },
      renglones_borrados: [{ id: "rc-dup", conteo_id: "c1", producto_id: "B", cantidad_contada: "3" }],
      conservado_antes: { codigo_barras: null, marca: "M", sector_id: null, margen_elegido: 100, proveedor_preferido_id: "prov-a" },
      absorbido_antes: { proveedor_preferido_id: "prov-b" },
    };
    await separarProductos(base.actual.pool as unknown as Cliente, "A", "B", registro);
    const vueltas = base.actual.sqlDe(/SET producto_id = \$1 WHERE id = ANY\(\$2::uuid\[\]\) AND producto_id = \$3/);
    expect(vueltas.map((v) => [v.sql.split(" ")[1], v.params])).toEqual([
      ["precio_proveedor", ["B", ["pp1", "pp2"], "A"]], ["item_venta", ["B", ["iv1"], "A"]], ["movimiento_stock", ["B", ["ms1"], "A"]],
    ]);
    expect(base.actual.sqlDe(/INSERT INTO renglon_conteo SELECT \* FROM jsonb_populate_recordset/)[0]!.params[0]).toBe(JSON.stringify(registro.renglones_borrados));
    expect(base.actual.sqlDe(/UPDATE producto SET codigo_barras = \$2/)[0]!.params).toEqual(["A", null, "M", null, 100, "prov-a"]);
    expect(base.actual.sqlDe(/UPDATE producto SET activo = true, reemplazado_por = NULL/)[0]!.params).toEqual(["B", "prov-b"]);
  });
});

describe("POST /equivalencias/separar", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("solo el dueño o el admin; 409 si el producto no está unido o no hay registro de la unión", async () => {
    expect((await pedir(app, "POST", "/equivalencias/separar", { rol: "mostrador", cuerpo: { absorbido_id: "B" } })).status).toBe(403);
    expect((await pedir(app, "POST", "/equivalencias/separar", { rol: "admin", cuerpo: {} })).status).toBe(400);
    expect((await pedir(app, "POST", "/equivalencias/separar", { rol: "admin", cuerpo: { absorbido_id: "B" } })).status).toBe(409);
    base.actual.programar(/SELECT reemplazado_por FROM producto WHERE id = \$1 FOR UPDATE/, { rows: [{ reemplazado_por: "A" }] });
    expect((await pedir(app, "POST", "/equivalencias/separar", { rol: "admin", cuerpo: { absorbido_id: "B" } })).status).toBe(409);
    expect(base.actual.sqlDe(/^ROLLBACK/).length).toBeGreaterThan(0);
  });

  it("con registro, separa y lo deja auditado", async () => {
    base.actual.programar(/SELECT reemplazado_por FROM producto WHERE id = \$1 FOR UPDATE/, { rows: [{ reemplazado_por: "A" }] });
    base.actual.programar(/SELECT contenido FROM evento WHERE tipo = 'producto.unido'/, { rows: [{ contenido: { conservar: "A", absorber: "B", movidos: { precio_proveedor: ["pp1"], item_venta: [], item_compra: [], movimiento_stock: [], consulta: [], renglon_conteo: [] }, renglones_borrados: [], conservado_antes: { codigo_barras: null, marca: null, sector_id: null, margen_elegido: null, proveedor_preferido_id: null }, absorbido_antes: { proveedor_preferido_id: null } } }] });
    const r = await pedir(app, "POST", "/equivalencias/separar", { rol: "dueño", cuerpo: { absorbido_id: "B" } });
    expect(r.status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE producto SET activo = true/)).toHaveLength(1);
    expect(base.actual.sqlDe(/INSERT INTO evento/).at(-1)!.params[1]).toBe("producto.separado");
    expect(base.actual.sqlDe(/^COMMIT/)).toHaveLength(1);
  });
});
