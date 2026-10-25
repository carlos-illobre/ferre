import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import * as datos from "./duplicados.js";
import { conteo, movimiento, precio, producto, proveedor, renglon, sector, usuario, venta } from "./pruebas/datos.js";
import { enTransaccion } from "./transaccion.js";

// Duplicados entre proveedores (002, issue #29).
describe("los duplicados", () => {
  it("sugiere por código de barras o por descripción entre proveedores distintos, una sola vez", async () => {
    const [a, b] = [await proveedor(), await proveedor()];
    const uno = await producto({ descripcion: "Cinta aisladora negra", codigo_barras: "779-zz-1", proveedor_preferido_id: a });
    const dos = await producto({ descripcion: "Otra cosa", codigo_barras: "779-zz-1", proveedor_preferido_id: b });
    const tres = await producto({ descripcion: "CINTA aisladora, negra", proveedor_preferido_id: b });
    // Del mismo proveedor que «uno»: con él no se sugiere, con «tres» sí.
    await producto({ descripcion: "Cinta aisladora negra", proveedor_preferido_id: a });
    expect(await datos.sugerirEquivalencias(base, [uno])).toBe(2);
    expect(await datos.sugerirEquivalencias(base, null)).toBe(1);
    expect(await datos.sugerirEquivalencias(base, null)).toBe(0);
    const pendientes = await datos.pendientes();
    const entre = (x: string, y: string) => pendientes.find((s) => [s.producto_a, s.producto_b].sort().join() === [x, y].sort().join());
    expect(entre(uno, dos)!.motivo).toBe("codigo_barras");
    expect(entre(uno, tres)!.motivo).toBe("descripcion");
    expect(await datos.resumenDe(uno)).toMatchObject({ descripcion: "Cinta aisladora negra", proveedor: null });
  });

  it("muchas sugerencias se guardan de a 500", async () => {
    const [a, b] = [await proveedor(), await proveedor()];
    await sql`INSERT INTO producto (id, descripcion, codigo_barras, proveedor_preferido_id)
      SELECT gen_random_uuid(), 'Lote ' || n, 'lote-' || n, ${a}::uuid FROM generate_series(1, 501) n
      UNION ALL SELECT gen_random_uuid(), 'Par ' || n, 'lote-' || n, ${b}::uuid FROM generate_series(1, 501) n`.execute(base);
    expect(await datos.sugerirEquivalencias(base, null)).toBe(501);
  });

  it("resolver una sugerencia, trabada; dos productos activos", async () => {
    const [a, b] = [await producto({ codigo_barras: "x-zz-2" }), await producto({ codigo_barras: "x-zz-2" })];
    await base.insertInto("equivalencia_sugerida").values({ id: crypto.randomUUID(), producto_a: a < b ? a : b, producto_b: a < b ? b : a, motivo: "codigo_barras" }).execute();
    const id = (await datos.pendientes()).find((s) => s.producto_a === (a < b ? a : b))!.id;
    const ana = await usuario();
    await enTransaccion(async (trx) => {
      expect(await datos.sugerenciaPendiente(trx, id)).toBeDefined();
      await datos.resolverSugerencia(trx, id, "rechazada", ana);
    });
    expect(await datos.sugerenciaPendiente(base, id)).toBeUndefined();
    expect(await datos.activos(base, a, b)).toBe(2);
  });

  it("unir mueve todo al conservado y anota qué movió; separar lo devuelve", async () => {
    const [p1, p2] = [await proveedor(), await proveedor()];
    const conservar = await producto({ descripcion: "Conservado", margen_elegido: null });
    const absorber = await producto({ descripcion: "Absorbido", codigo_barras: "abs-zz", marca: "Bahco", margen_elegido: 50, proveedor_preferido_id: p2 });
    const caro = await precio(conservar, p1, { costo_neto: 100, fecha_lista: new Date().toISOString().slice(0, 10) });
    const barato = await precio(absorber, p2, { costo_neto: 60, fecha_lista: new Date().toISOString().slice(0, 10) });
    const v = await venta();
    const item = await renglon(v, { producto_id: absorber });
    const mov = await movimiento(absorber, 3);
    const s = await sector();
    const c = await conteo(s);
    const ana = await usuario();
    await base.insertInto("renglon_conteo").values([
      { id: crypto.randomUUID(), conteo_id: c, producto_id: conservar, cantidad_contada: 1, contado_por: ana },
      { id: crypto.randomUUID(), conteo_id: c, producto_id: absorber, cantidad_contada: 2, contado_por: ana },
    ]).execute();
    await base.insertInto("equivalencia_sugerida").values({ id: crypto.randomUUID(), producto_a: absorber < conservar ? absorber : conservar, producto_b: absorber < conservar ? conservar : absorber, motivo: "descripcion" }).execute();

    expect(await datos.ultimaUnion(base, absorber)).toBeUndefined();
    const registro = await enTransaccion((trx) => datos.unirProductos(trx, conservar, absorber));
    expect(registro.movidos).toMatchObject({ precio_proveedor: [barato], item_venta: [item], movimiento_stock: [mov], item_compra: [], consulta: [] });
    expect(registro.renglones_borrados).toHaveLength(1);
    expect(registro.conservado_antes).toMatchObject({ codigo_barras: null, marca: null, margen_elegido: null });
    expect(registro.absorbido_antes).toEqual({ proveedor_preferido_id: p2 });
    const unido = await base.selectFrom("producto").select(["codigo_barras", "marca", "margen_elegido", "proveedor_preferido_id"]).where("id", "=", conservar).executeTakeFirstOrThrow();
    expect(unido).toEqual({ codigo_barras: "abs-zz", marca: "Bahco", margen_elegido: 50, proveedor_preferido_id: p2 });
    expect(await datos.activos(base, conservar, absorber)).toBe(1);
    expect(await datos.reemplazoDe(base, absorber)).toBe(conservar);
    expect(await datos.reemplazoDe(base, crypto.randomUUID())).toBeNull();
    expect((await datos.unidos()).find((u) => u.absorbido_id === absorber)).toMatchObject({ conservado: "Conservado" });
    expect((await datos.pendientes()).some((x) => x.producto_a === absorber || x.producto_b === absorber)).toBe(false);

    // La unión queda en su tabla, con lo que se movió: con eso se separa.
    const guardado = (await datos.ultimaUnion(base, absorber))!;
    expect(guardado).toEqual(JSON.parse(JSON.stringify({ ...registro, conservar })));
    await enTransaccion((trx) => datos.separarProductos(trx, conservar, absorber, guardado));
    expect(await datos.reemplazoDe(base, absorber)).toBeNull();
    expect((await base.selectFrom("precio_proveedor").select("producto_id").where("id", "=", barato).executeTakeFirstOrThrow()).producto_id).toBe(absorber);
    expect((await base.selectFrom("precio_proveedor").select("producto_id").where("id", "=", caro).executeTakeFirstOrThrow()).producto_id).toBe(conservar);
    expect(await base.selectFrom("renglon_conteo").select("producto_id").where("conteo_id", "=", c).execute()).toHaveLength(2);
    expect((await base.selectFrom("producto").select("codigo_barras").where("id", "=", conservar).executeTakeFirstOrThrow()).codigo_barras).toBeNull();
  });
});
