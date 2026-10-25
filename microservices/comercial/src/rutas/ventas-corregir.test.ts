import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

// Corregir una venta (specs/019, historia 1). La base es de mentira: se programa la venta y sus
// renglones, y se mira qué escribe el servidor.
const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

const ID = "22222222-2222-4222-8222-222222222222";
const R1 = "33333333-3333-4333-8333-333333333333";
const R2 = "44444444-4444-4444-8444-444444444444";
const VERSION = "2026-10-20T15:00:00.000Z";
const renglon = (id: string, producto: string, cantidad: number, precio: number, devuelto = 0) => ({ id, orden: 1, producto_id: producto, descripcion: producto.toUpperCase(), cantidad: String(cantidad), precio_unitario: String(precio), margen_aplicado: 100, devuelto: String(devuelto) });

function programar(venta: Partial<{ estado: string; de_hoy: boolean; medio_pago: string; total: string; version: string }> = {}, renglones = [renglon(R1, "mecha", 4, 3000), renglon(R2, "tarugo", 1, 8000)]) {
  base.actual.programar(/from "venta" where "id" = \$\d+ for update/, { rows: [{ id: ID, fecha: new Date(), estado: venta.estado ?? "confirmada", total: venta.total ?? "20000.00", medio_pago: venta.medio_pago ?? "efectivo", cliente_id: null, pagada_en: null, modificado_en: new Date(venta.version ?? VERSION), de_hoy: venta.de_hoy ?? true }] });
  base.actual.programar(/from "item_venta" where "venta_id" = \$1 and "quitado_por" is null/, { rows: renglones });
  base.actual.programar(/from "movimiento_stock" where "producto_id" = \$1/, { rows: [{ stock: "10" }] });
  base.actual.programar(/max\(orden\)/i, { rows: [{ n: 2 }] });
}
const items = (mecha: number, tarugo: number | null, extra: unknown[] = []) => [
  { id: R1, producto_id: "mecha", descripcion: "MECHA", cantidad: mecha, precio_unitario: 3000, margen_aplicado: 100 },
  ...(tarugo === null ? [] : [{ id: R2, producto_id: "tarugo", descripcion: "TARUGO", cantidad: 1, precio_unitario: tarugo, margen_aplicado: tarugo === 8000 ? 100 : null }]),
  ...extra,
];
const corregir = (cuerpo: unknown, rol: "dueño" | "cajero" | "soloVende" = "dueño") => pedir(app, "POST", `/ventas/${ID}/corregir`, { rol, cuerpo });

describe("POST /ventas/:id/corregir", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("019-E04 019-E06 019-E07: bajar de 4 a 3 mechas devuelve $3.000 en efectivo, la mecha vuelve al stock y queda la foto y Actividad", async () => {
    programar();
    const r = await corregir({ version: VERSION, medio_pago: "efectivo", items: items(3, 8000) });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ total: 17000, diferencia: -3000, resuelta: "devuelta" });
    expect(base.actual.sqlDe(/insert into "correccion_venta"/)).toHaveLength(1);
    const stock = base.actual.sqlDe(/insert into "movimiento_stock"/)[0]!.params;
    expect(stock).toEqual(expect.arrayContaining(["mecha", "correccion", 1]));
    const plata = base.actual.sqlDe(/insert into "movimiento_dinero"/)[0]!.params;
    expect(plata).toEqual(expect.arrayContaining(["devolucion", "efectivo", "-3000.00"]));
    expect(base.actual.sqlDe(/update "venta" set "total" = \$1/)[0]!.params[0]).toBe("17000.00");
    expect(base.actual.eventos()[0]!.tipo).toBe("venta.corregida");
  });

  it("019-E02 019-E03 019-E29: un precio a mano más alto se cobra tal cual con el medio elegido", async () => {
    programar();
    const r = await corregir({ version: VERSION, medio_pago: "efectivo", medio_diferencia: "mercado_pago", items: items(4, 9500) });
    expect(await r.json()).toMatchObject({ total: 21500, diferencia: 1500, resuelta: "cobrada" });
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)[0]!.params).toEqual(expect.arrayContaining(["cobro_diferencia", "mercado_pago", "1500.00"]));
  });

  it("019-E05: en cuenta corriente la diferencia queda en la deuda: no se cobra ni se devuelve", async () => {
    programar({ medio_pago: "cuenta_corriente" });
    base.actual.programar(/from "cliente" where "id" = \$1 and "cuenta_corriente" = \$2/, { rows: [{ id: "c1" }] });
    const r = await corregir({ version: VERSION, medio_pago: "cuenta_corriente", cliente_id: "c1", items: items(3, 8000) });
    expect(await r.json()).toMatchObject({ resuelta: "cuenta_corriente", diferencia: -3000 });
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)).toHaveLength(0);
  });

  it("019-E06: quitar un renglón lo marca (no lo borra) y vuelve al stock; uno nuevo se agrega y sale del stock", async () => {
    programar();
    const nuevo = { producto_id: "lija", descripcion: "LIJA", cantidad: 2, precio_unitario: 1000, margen_aplicado: 300 };
    const r = await corregir({ version: VERSION, medio_pago: "efectivo", items: items(4, null, [nuevo]) });
    expect(await r.json()).toMatchObject({ total: 14000, diferencia: -6000 });
    expect(base.actual.sqlDe(/update "item_venta" set "quitado_por"/)).toHaveLength(1);
    expect(base.actual.sqlDe(/delete from "item_venta"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/insert into "item_venta"/)).toHaveLength(1);
    const movs = base.actual.sqlDe(/insert into "movimiento_stock"/).map((c) => c.params);
    expect(movs).toEqual(expect.arrayContaining([expect.arrayContaining(["tarugo", 1]), expect.arrayContaining(["lija", -2])]));
  });

  it("019-E31: el total lo calcula el servidor con los renglones, no lo que diga el pedido", async () => {
    programar();
    const r = await corregir({ version: VERSION, medio_pago: "efectivo", total: 1, diferencia: 99999, items: items(4, 8000) });
    expect(await r.json()).toMatchObject({ total: 20000, diferencia: 0, resuelta: "sin_diferencia" });
    expect(base.actual.sqlDe(/insert into "movimiento_dinero"/)).toHaveLength(0);
  });

  it("019-E22: una venta anulada no se corrige", async () => {
    programar({ estado: "anulada" });
    expect((await corregir({ version: VERSION, medio_pago: "efectivo", items: items(3, 8000) })).status).toBe(409);
    expect(base.actual.sqlDe(/insert into "correccion_venta"/)).toHaveLength(0);
  });

  it("019-E24: una venta de otro día pide «Anular ventas de cualquier día»; sin permiso de anular, 403", async () => {
    programar({ de_hoy: false });
    const r = await corregir({ version: VERSION, medio_pago: "efectivo", items: items(3, 8000) }, "cajero");
    expect(r.status).toBe(403);
    expect((await r.json()).permiso).toBe("ventas.anular_cualquiera");
    expect((await corregir({ version: VERSION, medio_pago: "efectivo", items: items(3, 8000) }, "soloVende")).status).toBe(403);
    expect(base.actual.sqlDe(/insert into "correccion_venta"/)).toHaveLength(0);
  });

  it("019-E25: dejar la venta sin renglones no se puede: para eso se anula", async () => {
    programar();
    const r = await corregir({ version: VERSION, medio_pago: "efectivo", items: [] });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toContain("se anula");
  });

  it("019-E28: si otro la cambió mientras tanto, 409 y no se pisa", async () => {
    programar({ version: "2026-10-20T15:05:00.000Z" });
    expect((await corregir({ version: VERSION, medio_pago: "efectivo", items: items(3, 8000) })).status).toBe(409);
    expect(base.actual.sqlDe(/update "venta"/)).toHaveLength(0);
  });

  it("019-E26: un renglón no baja de lo que ya volvió por un cambio", async () => {
    programar({}, [renglon(R1, "mecha", 4, 3000, 2), renglon(R2, "tarugo", 1, 8000)]);
    expect((await corregir({ version: VERSION, medio_pago: "efectivo", items: items(1, 8000) })).status).toBe(409);
  });
});
