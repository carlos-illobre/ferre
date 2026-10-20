import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

const venta = { id: "11111111-1111-4111-8111-111111111111", medio_pago: "efectivo", items: [{ producto_id: "p1", descripcion: "MECHA", cantidad: 3, precio_unitario: 3000, margen_aplicado: 100, costo_neto: 1000, explicacion: { pasos: ["+ 100 % de margen"] } }] };

describe("POST /ventas", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("valida medio de pago, cliente de cuenta corriente, ítems, cantidades y precios", async () => {
    const casos: [unknown, string][] = [
      [{ ...venta, medio_pago: "cheque" }, "medio de pago"],
      [{ ...venta, medio_pago: "cuenta_corriente" }, "necesita el cliente"],
      [{ ...venta, items: [] }, "no tiene productos"],
      [{ ...venta, items: [{ ...venta.items[0], cantidad: 0 }] }, "cantidad inválida"],
      [{ ...venta, items: [{ ...venta.items[0], precio_unitario: -1 }] }, "precio inválido"],
      [{ ...venta, items: [{ ...venta.items[0], descripcion: " " }] }, "no tiene descripción"],
      [{ ...venta, id: "no-es-uuid" }, "UUID"],
    ];
    for (const [cuerpo, mensaje] of casos) {
      const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo });
      expect(r.status, mensaje).toBe(400);
      expect(((await r.json()) as { error: string }).error).toContain(mensaje);
    }
  });

  it("registra la venta con su total, guarda cada ítem con precio, margen y explicación, y descuenta stock", async () => {
    base.actual.programar(/SUM\(cantidad\), 0\) as "stock" from "movimiento_stock"/, { rows: [{ stock: "10" }] });
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(201);
    const ventaSql = base.actual.sqlDe(/insert into "venta" \(/)[0]!;
    expect(ventaSql.params[0]).toBe(venta.id);
    expect(ventaSql.params[4]).toBe("9000.00");
    const item = base.actual.sqlDe(/insert into "item_venta"/)[0]!;
    expect(item.params).toEqual(expect.arrayContaining(["MECHA", 3, 100, "3000.00", JSON.stringify({ pasos: ["+ 100 % de margen"] })]));
    const movimiento = base.actual.sqlDe(/insert into "movimiento_stock"/)[0]!;
    expect(movimiento.params).toContain(-3);
    expect(base.actual.sqlDe(/insert into "anomalia"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/^commit/)).toHaveLength(1);
  });

  // RF-59: una venta nunca deja el stock por debajo de cero; lo que faltaba es una anomalía.
  it("con stock en cero la venta se registra igual, el stock no baja y queda anotada la anomalía", async () => {
    base.actual.programar(/SUM\(cantidad\), 0\) as "stock" from "movimiento_stock"/, { rows: [{ stock: "0" }] });
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(201);
    expect(base.actual.sqlDe(/insert into "movimiento_stock"/)).toHaveLength(0);
    const anomalia = base.actual.sqlDe(/insert into "anomalia"/)[0]!;
    expect(anomalia.params.slice(1, 5)).toEqual(["p1", "u-mostrador", venta.id, 3]);
    expect(String(anomalia.params[5])).toContain("faltaban 3");
    expect(JSON.stringify(base.actual.sqlDe(/insert into "evento"/)[0]?.params ?? "")).toContain("anomalias");
  });

  it("si alcanza solo en parte, descuenta lo que hay y anota lo que faltó; un stock ya negativo no baja más", async () => {
    base.actual.programar(/SUM\(cantidad\), 0\) as "stock" from "movimiento_stock"/, { rows: [{ stock: "2" }] });
    await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(base.actual.sqlDe(/insert into "movimiento_stock"/)[0]!.params).toContain(-2);
    expect(base.actual.sqlDe(/insert into "anomalia"/)[0]!.params[4]).toBe(1);
    base.actual = baseFalsa();
    base.actual.programar(/SUM\(cantidad\), 0\) as "stock" from "movimiento_stock"/, { rows: [{ stock: "-4" }] });
    await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(base.actual.sqlDe(/insert into "movimiento_stock"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/insert into "anomalia"/)[0]!.params[4]).toBe(3);
  });

  it("anular devuelve al stock lo que la venta descontó, no lo que se vendió", async () => {
    base.actual.programar(/update "venta" set "estado"/, { rowCount: 1 });
    const r = await pedir(app, "POST", `/ventas/${venta.id}/anular`, { rol: "admin", cuerpo: {} });
    expect(r.status).toBeLessThan(300);
    expect(base.actual.sqlDe(/insert into "movimiento_stock"/)[0]!.sql).toMatch(/-cantidad[\s\S]*from "movimiento_stock" where "referencia_tipo" = \$/);
  });

  it("quien anula ventas del día no anula las de un día anterior; con «de cualquier día», sí (decisión 53)", async () => {
    base.actual.programar(/update "venta" set "estado"/, { rowCount: 1 });
    base.actual.programar(/as "de_hoy" from "venta"/, { rows: [{ de_hoy: false }] });
    const r = await pedir(app, "POST", `/ventas/${venta.id}/anular`, { rol: "cajero", cuerpo: {} });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toContain("Anular ventas de cualquier día");
    expect(base.actual.sqlDe(/update "venta" set "estado"/)).toHaveLength(0);
    // La de hoy sí.
    base.actual.programar(/as "de_hoy" from "venta"/, { rows: [{ de_hoy: true }] });
    expect((await pedir(app, "POST", `/ventas/${venta.id}/anular`, { rol: "cajero", cuerpo: {} })).status).toBeLessThan(300);
    // Con el permiso de cualquier día no se mira la fecha.
    base.actual = baseFalsa();
    base.actual.programar(/update "venta" set "estado"/, { rowCount: 1 });
    expect((await pedir(app, "POST", `/ventas/${venta.id}/anular`, { rol: "admin", cuerpo: {} })).status).toBeLessThan(300);
    expect(base.actual.sqlDe(/as "de_hoy" from "venta"/)).toHaveLength(0);
    expect((await pedir(app, "POST", `/ventas/${venta.id}/anular`, { rol: "soloVende", cuerpo: {} })).status).toBe(403);
  });

  it("003 historia 1, escenario 3: el servidor redondea los renglones calculados y respeta el del precio a mano (RF-19, decisión 128)", async () => {
    const items = [
      { ...venta.items[0], cantidad: 0.5, precio_unitario: 3000, margen_aplicado: 100 }, // $1.500 → $2.000
      { ...venta.items[0], producto_id: null, descripcion: "A MANO", cantidad: 1, precio_unitario: 1500, margen_aplicado: null }, // a mano: $1.500 tal cual
      { ...venta.items[0], cantidad: 0.3, precio_unitario: 10000, margen_aplicado: 100 }, // $3.000 justo: no sube
    ];
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: { ...venta, items } });
    expect(await r.json()).toMatchObject({ total: 6500 });
    expect(base.actual.sqlDe(/insert into "venta" \(/)[0]!.params[4]).toBe("6500.00");
    // El precio por unidad y la cantidad se guardan tal cual: el redondeo es del renglón.
    expect(base.actual.sqlDe(/insert into "item_venta"/)[0]!.params).toEqual(expect.arrayContaining([0.5, "3000.00"]));
  });

  it("una venta reenviada (sin conexión, reintento) no se duplica", async () => {
    base.actual.programar(/select "id", "total", "estado" from "venta" where "id" = \$1/, { rows: [{ id: venta.id, total: "9000.00", estado: "confirmada" }] });
    const r = await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: venta });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: venta.id, total: 9000, repetida: true });
    expect(base.actual.sqlDe(/insert into "venta"/)).toHaveLength(0);
  });
});

describe("GET /ventas", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("los productos de las últimas ventas los pide quien vende, aunque no vea las ventas (decisión 133)", async () => {
    base.actual.programar(/max\(v.fecha\)/, { rows: [{ producto_id: "p2", ultima: new Date() }, { producto_id: "p1", ultima: new Date() }] });
    const r = await pedir(app, "GET", "/ventas/ultimos-productos", { rol: "mostrador" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ productos: ["p2", "p1"] });
    expect(base.actual.sqlDe(/max\(v.fecha\)/)[0]!.sql).toMatch(/"v"."estado" = \$1.*limit \$\d/s);
  });

  it("019-E21: los totales del día suman lo cobrado y restan lo devuelto por correcciones y cambios de ese día", async () => {
    base.actual.programar(/from "venta" as "v"/, { rows: [{ id: "v1", fecha: "2026-10-13T12:00:00Z", medio_pago: "efectivo", total: "10000", estado: "confirmada", pagada_en: null, cliente: null, items: [] }] });
    base.actual.programar(/from "movimiento_dinero" as "m"/, { rows: [
      { id: "m1", fecha: "2026-10-13T15:00:00Z", tipo: "cobro_diferencia", medio_pago: "mercado_pago", importe: "4000.00", venta_id: "v0", correccion_id: null, cambio_id: "c1", suma: true },
      { id: "m2", fecha: "2026-10-13T16:00:00Z", tipo: "devolucion", medio_pago: "efectivo", importe: "-3000.00", venta_id: "v9", correccion_id: "k1", cambio_id: null, suma: true },
      { id: "m3", fecha: "2026-10-13T17:00:00Z", tipo: "devolucion", medio_pago: "efectivo", importe: "-1000.00", venta_id: "v1", correccion_id: "k2", cambio_id: null, suma: false }, // ya está en el total corregido de v1
    ] });
    const cuerpo = await (await pedir(app, "GET", "/ventas")).json();
    expect(cuerpo.totales).toEqual({ efectivo: 7000, mercado_pago: 4000 });
    expect(cuerpo.total).toBe(11000);
    expect(cuerpo.movimientos).toHaveLength(3);
  });

  it("cada renglón llega con su subtotal calculado en el servidor, redondeado como se cobró (010-E06)", async () => {
    base.actual.programar(/from "venta" as "v"/, { rows: [{ id: "v1", fecha: "2026-10-13T12:00:00Z", medio_pago: "efectivo", total: "3000", estado: "confirmada", pagada_en: null, cliente: null, items: [{ descripcion: "CABLE", cantidad: "1.5", precio_unitario: "1500", margen_aplicado: 50, explicacion: null }, { descripcion: "A MANO", cantidad: "1", precio_unitario: "1500", margen_aplicado: null, explicacion: null }] }] });
    const r = await pedir(app, "GET", "/ventas");
    const cuerpo = await r.json();
    expect(cuerpo.ventas[0].items[0].subtotal).toBe(3000);
    expect(cuerpo.ventas[0].items[1].subtotal).toBe(1500); // el precio a mano, tal cual (decisión 128)
    expect(cuerpo.totales).toEqual({ efectivo: 3000 });
  });

  it("017-E16: un día mal escrito da 400 y no llega a la base", async () => {
    const r = await pedir(app, "GET", "/ventas?dia=" + encodeURIComponent("15/10'; DROP TABLE venta;--"));
    expect(r.status).toBe(400);
    expect(base.actual.sqlDe(/from "venta"/)).toHaveLength(0);
    expect((await pedir(app, "GET", "/ventas?dia=2026-10-15")).status).toBe(200);
  });
});
