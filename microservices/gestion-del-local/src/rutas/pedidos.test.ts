import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

const PEDIDO = "7a1e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c01";
const PROVEEDOR = "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11";
const MECHA = "1c0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c21";
const DISCO = "2d0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c31";
const borrador = (cambios: Record<string, unknown> = {}) => ({ proveedor_id: PROVEEDOR, items: [{ producto_id: MECHA, cantidad: 24 }, { producto_id: DISCO, cantidad: 7.5 }], ...cambios });
const tipos = () => base.actual.sqlDe(/INSERT INTO evento/).map((c) => c.params.find((p) => typeof p === "string" && p.startsWith("pedido."))).filter(Boolean);

// Pedidos a proveedores (RF-55, decisión 52).
describe("pedidos a proveedores", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/FROM proveedor WHERE id/, { rows: [{ nombre: "Tresge" }] }); });

  it("armar, mandar, cancelar y cerrar pide «Encargar compras»; quien registra ingresos solo ve los que esperan mercadería", async () => {
    expect((await pedir(app, "GET", "/pedidos", { rol: null })).status).toBe(401);
    expect((await pedir(app, "GET", "/pedidos", { rol: "soloVende" })).status).toBe(403);
    for (const [metodo, ruta] of [["PUT", `/pedidos/${PEDIDO}`], ["DELETE", `/pedidos/${PEDIDO}`], ["POST", `/pedidos/${PEDIDO}/enviar`], ["POST", `/pedidos/${PEDIDO}/cancelar`], ["POST", `/pedidos/${PEDIDO}/cerrar`]] as const) {
      const r = await pedir(app, metodo, ruta, { rol: "recepcion", cuerpo: metodo === "DELETE" ? undefined : borrador() });
      expect(r.status, `${metodo} ${ruta}`).toBe(403);
      expect(((await r.json()) as { error: string }).error).toContain("Encargar compras");
    }
    expect((await pedir(app, "GET", "/pedidos", { rol: "recepcion" })).status).toBe(200);
    const lista = base.actual.sqlDe(/FROM pedido pe JOIN proveedor/).at(-1)!;
    expect(lista.sql).toContain("pe.estado = ANY");
    expect(lista.params).toEqual([["enviado", "recibido_parcial"]]);
    await pedir(app, "GET", "/pedidos", { rol: "mostrador" });
    expect(base.actual.sqlDe(/FROM pedido pe JOIN proveedor/).at(-1)!.sql).not.toContain("pe.estado = ANY");
  });

  it("el borrador se guarda entero, con el costo de la última lista de ese proveedor como estimado", async () => {
    const r = await pedir(app, "PUT", `/pedidos/${PEDIDO}`, { rol: "mostrador", cuerpo: borrador() });
    expect(r.status).toBe(200);
    expect(base.actual.sqlDe(/INSERT INTO pedido \(/)[0]!.params).toEqual([PEDIDO, PROVEEDOR, "u-mostrador"]);
    const items = base.actual.sqlDe(/INSERT INTO item_pedido/);
    expect(items).toHaveLength(2);
    expect(items[0]!.sql).toContain("FROM precio_proveedor");
    expect(items[1]!.params.slice(2)).toEqual([2, DISCO, 7.5, PROVEEDOR]);
    // Guardarlo de nuevo lo reemplaza: no duplica renglones.
    base.actual.programar(/SELECT estado FROM pedido WHERE id/, { rows: [{ estado: "borrador" }] });
    await pedir(app, "PUT", `/pedidos/${PEDIDO}`, { rol: "mostrador", cuerpo: borrador({ items: [{ producto_id: MECHA, cantidad: 10 }] }) });
    expect(base.actual.sqlDe(/DELETE FROM item_pedido/)).toHaveLength(2);
    expect(base.actual.sqlDe(/INSERT INTO pedido \(/)).toHaveLength(1);
  });

  it("no acepta un pedido sin proveedor, con cantidad inválida o con un producto repetido, ni cambiar uno que ya se mandó", async () => {
    const guardar = (cuerpo: unknown) => pedir(app, "PUT", `/pedidos/${PEDIDO}`, { cuerpo }).then((r) => r.status);
    expect(await guardar({ items: [] })).toBe(400);
    expect(await guardar(borrador({ items: [{ producto_id: MECHA, cantidad: 0 }] }))).toBe(400);
    expect(await guardar(borrador({ items: [{ producto_id: MECHA, cantidad: 1 }, { producto_id: MECHA, cantidad: 2 }] }))).toBe(400);
    base.actual.programar(/SELECT estado FROM pedido WHERE id/, { rows: [{ estado: "enviado" }] });
    expect(await guardar(borrador())).toBe(409);
    expect(base.actual.sqlDe(/INSERT INTO item_pedido/)).toHaveLength(0);
  });

  it("mandarlo lo deja «enviado» con quién y cuándo, y guarda el WhatsApp del proveedor si viene", async () => {
    base.actual.programar(/SELECT pe\.estado, pe\.proveedor_id/, { rows: [{ estado: "borrador", proveedor_id: PROVEEDOR, proveedor: "Tresge", renglones: "2" }] });
    const r = await pedir(app, "POST", `/pedidos/${PEDIDO}/enviar`, { rol: "mostrador", cuerpo: { whatsapp: "+54 9 11 5555-0101" } });
    expect(r.status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE pedido SET estado = 'enviado'/)[0]!.params).toEqual(["u-mostrador", PEDIDO]);
    expect(base.actual.sqlDe(/UPDATE proveedor SET whatsapp/)[0]!.params).toEqual(["5491155550101", PROVEEDOR]);
    expect(tipos()).toEqual(["pedido.enviado"]);
  });

  it("no se manda vacío, ni dos veces, ni con un número que no es un teléfono", async () => {
    const enviar = (cuerpo: unknown = {}) => pedir(app, "POST", `/pedidos/${PEDIDO}/enviar`, { cuerpo }).then((r) => r.status);
    expect(await enviar()).toBe(404);
    expect(await enviar({ whatsapp: "123" })).toBe(400);
    base.actual.programar(/SELECT pe\.estado, pe\.proveedor_id/, { rows: [{ estado: "borrador", proveedor_id: PROVEEDOR, proveedor: "Tresge", renglones: "0" }] });
    expect(await enviar()).toBe(400);
    base.actual.programar(/SELECT pe\.estado, pe\.proveedor_id/, { rows: [{ estado: "enviado", proveedor_id: PROVEEDOR, proveedor: "Tresge", renglones: "2" }] });
    expect(await enviar()).toBe(409);
    expect(base.actual.sqlDe(/UPDATE pedido SET estado = 'enviado'/)).toHaveLength(0);
  });

  it("se cancela solo el enviado y se cierra solo el que llegó incompleto; el borrador se borra", async () => {
    expect((await pedir(app, "POST", `/pedidos/${PEDIDO}/cancelar`)).status).toBe(409);
    base.actual.programar(/UPDATE pedido SET estado = \$1, cerrado_por/, { rowCount: 1 });
    expect((await pedir(app, "POST", `/pedidos/${PEDIDO}/cancelar`, { rol: "mostrador" })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE pedido SET estado = \$1, cerrado_por/).at(-1)!.params).toEqual(["cancelado", "u-mostrador", PEDIDO, "enviado"]);
    expect((await pedir(app, "POST", `/pedidos/${PEDIDO}/cerrar`, { rol: "mostrador" })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE pedido SET estado = \$1, cerrado_por/).at(-1)!.params).toEqual(["cerrado_incompleto", "u-mostrador", PEDIDO, "recibido_parcial"]);
    expect(tipos()).toEqual(["pedido.cancelado", "pedido.cerrado"]);
    expect((await pedir(app, "DELETE", `/pedidos/${PEDIDO}`)).status).toBe(409);
    base.actual.programar(/DELETE FROM pedido WHERE id/, { rowCount: 1 });
    expect((await pedir(app, "DELETE", `/pedidos/${PEDIDO}`)).status).toBe(204);
  });
});

// El ingreso de mercadería recibe el pedido (RF-50 y RF-55).
describe("ingresar la mercadería de un pedido", () => {
  const compra = (cambios: Record<string, unknown> = {}) => ({ proveedor_id: PROVEEDOR, fecha: "2026-10-11", comprobante_tipo: "sin_comprobante", pedido_id: PEDIDO, items: [{ producto_id: MECHA, descripcion: "Mecha", cantidad: 24, costo_unitario: 2480 }], ...cambios });
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/FROM proveedor WHERE id/, { rows: [{ nombre: "Tresge" }] }); });
  const esperando = (estado = "enviado", proveedor = PROVEEDOR) => base.actual.programar(/SELECT estado, proveedor_id FROM pedido/, { rows: [{ estado, proveedor_id: proveedor }] });

  it("si llegó todo queda «recibido»; si falta algo, «recibido parcial»", async () => {
    esperando();
    base.actual.programar(/count\(\*\) AS faltan/, { rows: [{ faltan: "0" }] });
    const r = await pedir(app, "POST", "/compras", { rol: "recepcion", cuerpo: compra() });
    expect(r.status).toBe(201);
    expect(base.actual.sqlDe(/UPDATE item_pedido SET recibido = recibido \+/)[0]!.params).toEqual([24, PEDIDO, MECHA]);
    expect(base.actual.sqlDe(/UPDATE pedido SET estado = \$1 WHERE/)[0]!.params).toEqual(["recibido", PEDIDO]);
    expect(base.actual.sqlDe(/INSERT INTO compra \(/)[0]!.params[7]).toBe(PEDIDO);

    base.actual.programar(/count\(\*\) AS faltan/, { rows: [{ faltan: "1" }] });
    await pedir(app, "POST", "/compras", { rol: "recepcion", cuerpo: compra() });
    expect(base.actual.sqlDe(/UPDATE pedido SET estado = \$1 WHERE/).at(-1)!.params).toEqual(["recibido_parcial", PEDIDO]);
  });

  it("no recibe mercadería un pedido que no existe, que es de otro proveedor o que ya no la espera", async () => {
    const ingresar = () => pedir(app, "POST", "/compras", { cuerpo: compra() }).then((r) => r.status);
    expect(await ingresar()).toBe(404);
    esperando("enviado", MECHA);
    expect(await ingresar()).toBe(409);
    for (const estado of ["borrador", "recibido", "cancelado", "cerrado_incompleto"]) { esperando(estado); expect(await ingresar(), estado).toBe(409); }
    expect(base.actual.sqlDe(/INSERT INTO movimiento_stock/)).toHaveLength(0);
  });
});
