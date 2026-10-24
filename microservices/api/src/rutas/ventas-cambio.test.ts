import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

// Cambio de producto y devolución (specs/019, historia 2). La base es de mentira: se programa la venta
// original y sus renglones, y se mira qué escribe el servidor.
const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

const ID = "22222222-2222-4222-8222-222222222222";
const PINZA = "33333333-3333-4333-8333-333333333333";
const MECHA = "44444444-4444-4444-8444-444444444444";
const renglon = (id: string, producto: string, cantidad: number, precio: number, devuelto = 0) => ({ id, orden: 1, producto_id: producto, descripcion: producto.toUpperCase(), cantidad: String(cantidad), precio_unitario: String(precio), margen_aplicado: 100, devuelto: String(devuelto) });

function programar(venta: Partial<{ estado: string; medio_pago: string; cliente_id: string | null; dias: number }> = {}, renglones = [renglon(PINZA, "pinza", 1, 14000), renglon(MECHA, "mecha", 3, 4000)]) {
  const fecha = new Date(Date.now() - (venta.dias ?? 1) * 86_400_000);
  base.actual.programar(/from "venta" where "id" = \$\d+ for update/, { rows: [{ id: ID, fecha, estado: venta.estado ?? "confirmada", total: "26000.00", medio_pago: venta.medio_pago ?? "efectivo", cliente_id: venta.cliente_id ?? null, pagada_en: null, modificado_en: fecha, de_hoy: false }] });
  base.actual.programar(/from "item_venta" where "venta_id" = \$1 and "quitado_por" is null/, { rows: renglones });
  base.actual.programar(/from "movimiento_stock" where "producto_id" = \$1/, { rows: [{ stock: "10" }] });
}
const lleva = (precio: number, margen: number | null = 100) => ({ producto_id: "pinza-punta", descripcion: "PINZA DE PUNTA", cantidad: 1, precio_unitario: precio, margen_aplicado: margen });
const cambiar = (cuerpo: unknown, rol: "dueño" | "cajero" | "soloVende" = "cajero") => pedir(app, "POST", `/ventas/${ID}/cambio`, { rol, cuerpo });

describe("POST /ventas/:id/cambio", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("019-E12 019-E14 019-E15: la pinza vuelve al precio pagado, se lleva una de $18.000: se cobran $4.000 con el medio elegido; una vuelve al stock y la otra sale", async () => {
    programar();
    const r = await cambiar({ vuelve: [{ item_id: PINZA, cantidad: 1, fallado: false }], se_lleva: [lleva(18000)], medio_diferencia: "mercado_pago" });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ vuelve: 14000, se_lleva: 18000, diferencia: 4000, resuelto: "cobrado" });
    expect(base.actual.sqlDe(/insert into "cambio"/)).toHaveLength(1);
    expect(base.actual.sqlDe(/insert into "cambio_renglon"/)).toHaveLength(2);
    expect(base.actual.sqlDe(/update "item_venta" set "devuelto"/)).toHaveLength(1);
    const movs = base.actual.sqlDe(/insert into "movimiento_stock"/).map((c) => c.params);
    expect(movs).toEqual(expect.arrayContaining([expect.arrayContaining(["pinza", "cambio", 1]), expect.arrayContaining(["pinza-punta", "cambio", -1])]));
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)[0]!.params).toEqual(expect.arrayContaining(["cobro_diferencia", "mercado_pago", "4000.00"]));
    expect(base.actual.sqlDe(/insert into "evento"/)[0]!.params).toEqual(expect.arrayContaining(["venta.cambio"]));
    // La venta original no cambia.
    expect(base.actual.sqlDe(/update "venta"/)).toHaveLength(0);
  });

  it("019-E12 019-E16: vuelve 1 de 3 mechas al precio pagado y se lleva algo más barato: se devuelve la diferencia en efectivo", async () => {
    programar();
    const r = await cambiar({ vuelve: [{ item_id: MECHA, cantidad: 1, fallado: false }], se_lleva: [lleva(2500, null)] });
    expect(await r.json()).toMatchObject({ vuelve: 4000, diferencia: -1500, resuelto: "devuelto" });
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)[0]!.params).toEqual(expect.arrayContaining(["devolucion", "efectivo", "-1500.00"]));
  });

  it("019-E13: lo que vuelve fallado no vuelve al stock: queda anotado", async () => {
    programar();
    await cambiar({ vuelve: [{ item_id: PINZA, cantidad: 1, fallado: true }], se_lleva: [lleva(14000)] });
    expect(base.actual.sqlDe(/insert into "anomalia"/)[0]!.params).toEqual(expect.arrayContaining(["devuelto_fallado", "pinza"]));
    const movs = base.actual.sqlDe(/insert into "movimiento_stock"/).map((c) => c.params);
    expect(movs).not.toEqual(expect.arrayContaining([expect.arrayContaining(["pinza", "cambio", 1])]));
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)).toHaveLength(0);
  });

  it("019-E16 019-E18: una devolución en una venta a cuenta corriente baja la deuda del cliente", async () => {
    programar({ medio_pago: "cuenta_corriente", cliente_id: "c1" });
    const r = await cambiar({ vuelve: [{ item_id: MECHA, cantidad: 3, fallado: false }] });
    expect(await r.json()).toMatchObject({ se_lleva: 0, diferencia: -12000, resuelto: "cuenta_corriente" });
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)[0]!.params).toEqual(expect.arrayContaining(["devolucion", "cuenta_corriente", "c1", "-12000.00"]));
  });

  it("019-E26: no vuelve más de lo que queda por devolver, sumando los cambios anteriores", async () => {
    programar({}, [renglon(MECHA, "mecha", 3, 4000, 2)]);
    const r = await cambiar({ vuelve: [{ item_id: MECHA, cantidad: 2, fallado: false }] });
    expect(r.status).toBe(409);
    expect(base.actual.sqlDe(/insert into "cambio"/)).toHaveLength(0);
  });

  it("019-E23: pasados 15 días ya no se cambia", async () => {
    programar({ dias: 16 });
    const r = await cambiar({ vuelve: [{ item_id: PINZA, cantidad: 1, fallado: false }] });
    expect(r.status).toBe(409);
    expect((await r.json()).error).toContain("15 días");
  });

  it("019-E22: una venta anulada no se cambia", async () => {
    programar({ estado: "anulada" });
    expect((await cambiar({ vuelve: [{ item_id: PINZA, cantidad: 1, fallado: false }] })).status).toBe(409);
  });

  it("019-E24: sin el permiso de anular las ventas del día, 403", async () => {
    programar();
    expect((await cambiar({ vuelve: [{ item_id: PINZA, cantidad: 1, fallado: false }] }, "soloVende")).status).toBe(403);
  });

  it("019-E31: la diferencia la calcula el servidor con los renglones", async () => {
    programar();
    const r = await cambiar({ vuelve: [{ item_id: PINZA, cantidad: 1, fallado: false }], se_lleva: [lleva(14000)], diferencia: 99999 });
    expect(await r.json()).toMatchObject({ diferencia: 0, resuelto: "sin_diferencia" });
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)).toHaveLength(0);
  });
});

describe("GET /ventas/para-cambio", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("019-E11: las ventas de los últimos 15 días con ese producto, con lo que queda por devolver y lo que se pagó", async () => {
    base.actual.programar(/from "venta" as "v"/, { rows: [{ id: ID, fecha: new Date("2026-10-18T15:00:00Z"), medio_pago: "efectivo", total: "26000.00", cliente: null,
      items: [{ id: MECHA, producto_id: "mecha", descripcion: "MECHA", cantidad: "3", precio_unitario: "4000", margen_aplicado: 100, devuelto: "1", foto_url: null }] }] });
    const r = await pedir(app, "GET", "/ventas/para-cambio?q=mecha", { rol: "cajero" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual([expect.objectContaining({ id: ID, items: [expect.objectContaining({ id: MECHA, por_devolver: 2, pagado: 4000 })] })]);
    const consulta = base.actual.sqlDe(/from "venta" as "v"/)[0]!;
    expect(consulta.params).toEqual(expect.arrayContaining(["%mecha%", 15]));
  });

  it("019-E24: quien solo vende no busca ventas para cambiar", async () => {
    expect((await pedir(app, "GET", "/ventas/para-cambio?q=mecha", { rol: "soloVende" })).status).toBe(403);
  });
});

describe("POST /ventas/:id/anular después de un cambio", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("019-E32: una venta que ya tuvo un cambio se anula y se deshace todo: vuelve lo de la venta, sus correcciones y sus cambios, y lo fallado sigue afuera", async () => {
    base.actual.programar(/update "venta" set "estado"/, { rows: [], rowCount: 1 });
    const r = await pedir(app, "POST", `/ventas/${ID}/anular`, { rol: "dueño", cuerpo: {} });
    expect(r.status).toBe(204);
    const stock = base.actual.sqlDe(/insert into "movimiento_stock"/);
    expect(stock).toHaveLength(2);
    expect(stock[0]!.sql).toMatch(/"tipo" in \(\$\d+, \$\d+, \$\d+\)/);
    expect(stock[0]!.params).toEqual(expect.arrayContaining(["venta", "correccion", "cambio"]));
    expect(stock[1]!.sql).toMatch(/from "cambio_renglon"/);
    expect(stock[1]!.params).toEqual(expect.arrayContaining(["vuelve", true]));
  });

  it("019-E32: la plata de los cambios de una venta anulada deja de contar en el día y en la deuda", async () => {
    await pedir(app, "GET", "/ventas", { rol: "dueño" });
    expect(base.actual.sqlDe(/from "movimiento_dinero" as "m"/)[0]!.sql).toMatch(/"v"\."estado" = \$/);
    await pedir(app, "GET", "/clientes", { rol: "dueño" });
    expect(base.actual.sqlDe(/FROM movimiento_dinero m/)[0]!.sql).toMatch(/mv\.estado = 'confirmada'/);
  });
});
