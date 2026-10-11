import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const escritos = vi.hoisted(() => [] as string[]);
vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async (ruta: string) => { escritos.push(String(ruta)); }),
  readFile: vi.fn(async (ruta: string) => { if (String(ruta).includes("00000000")) throw new Error("no existe"); return Buffer.from("imagen"); }),
}));
const { app } = await import("../app.js");

const PROVEEDOR = "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11";
const FOTO = "5d1f0a52-93a1-4f0e-8c1b-7a2e6d4c9b10.jpg";
const conFoto = (tipo = "image/jpeg") => { const f = new FormData(); f.append("foto", new File(["x"], "factura.jpg", { type: tipo })); return f; };
const compra = (cambios: Record<string, unknown> = {}) => ({ proveedor_id: PROVEEDOR, fecha: "2026-10-11", comprobante_tipo: "factura", foto: FOTO, items: [{ producto_id: PROVEEDOR, descripcion: "Cinta", cantidad: 10, costo_unitario: 1200 }], ...cambios });

// La foto del comprobante reemplaza al número tipeado (RF-50).
describe("foto del comprobante de una compra", () => {
  beforeEach(() => { base.actual = baseFalsa(); escritos.length = 0; base.actual.programar(/FROM proveedor WHERE id/, { rows: [{ nombre: "Comodo" }] }); });

  it("sin sesión no se sube ni se ve", async () => {
    expect((await pedir(app, "POST", "/compras/fotos", { rol: null, formulario: conFoto() })).status).toBe(401);
    expect((await pedir(app, "GET", `/compras/fotos/${FOTO}`, { rol: null })).status).toBe(401);
  });

  it("se sube con nombre al azar y queda suelta a nombre de quien la subió", async () => {
    const r = await pedir(app, "POST", "/compras/fotos", { rol: "mostrador", formulario: conFoto() });
    expect(r.status).toBe(201);
    const { foto } = (await r.json()) as { foto: string };
    expect(foto).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(escritos[0]).toContain(`comprobantes/${foto}`);
    expect(base.actual.sqlDe(/INSERT INTO foto_comprobante/)[0]!.params).toEqual([foto, "u-mostrador"]);
  });

  it("no acepta lo que no es una imagen", async () => {
    expect((await pedir(app, "POST", "/compras/fotos", { formulario: conFoto("application/pdf") })).status).toBe(400);
    expect((await pedir(app, "POST", "/compras/fotos", { formulario: new FormData() })).status).toBe(400);
    expect(escritos).toHaveLength(0);
  });

  it("la computadora recibe la foto suelta que el mismo usuario subió después de pedirla", async () => {
    base.actual.programar(/FROM foto_comprobante WHERE usuario_id/, { rows: [{ archivo: FOTO }] });
    const r = await pedir(app, "GET", "/compras/fotos/sueltas?desde=2026-10-11T12:00:00.000Z", { rol: "admin" });
    expect(await r.json()).toEqual({ foto: FOTO });
    expect(base.actual.sqlDe(/FROM foto_comprobante WHERE usuario_id/)[0]!.params).toEqual(["u-admin", "2026-10-11T12:00:00.000Z"]);
    expect((await pedir(app, "GET", "/compras/fotos/sueltas")).status).toBe(400);
  });

  it("la foto se entrega con sesión; una que no existe o con nombre raro, 404", async () => {
    const r = await pedir(app, "GET", `/compras/fotos/${FOTO}`);
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("image/jpeg");
    expect(r.headers.get("Cache-Control")).toContain("private");
    expect((await pedir(app, "GET", "/compras/fotos/00000000-93a1-4f0e-8c1b-7a2e6d4c9b10.jpg")).status).toBe(404);
    expect((await pedir(app, "GET", "/compras/fotos/..%2Fsecreto.jpg")).status).toBe(404);
  });

  it("al registrar la compra la foto queda unida a ella, sin número de comprobante", async () => {
    const r = await pedir(app, "POST", "/compras", { cuerpo: compra() });
    expect(r.status).toBe(201);
    const { id } = (await r.json()) as { id: string };
    expect(base.actual.sqlDe(/UPDATE foto_comprobante SET compra_id/)[0]!.params).toEqual([id, FOTO]);
    expect(base.actual.sqlDe(/INSERT INTO compra \(/)[0]!.params[4]).toBeNull();
    // El costo nuevo se explica por la factura, sin inventarle un número.
    expect(String(base.actual.sqlDe(/INSERT INTO precio_proveedor/)[0]!.params[6])).toContain("según factura de Comodo del 11/10/2026");
  });

  it("sin comprobante no hay foto que unir, y un nombre de foto inválido se rechaza", async () => {
    await pedir(app, "POST", "/compras", { cuerpo: compra({ comprobante_tipo: "sin_comprobante" }) });
    expect(base.actual.sqlDe(/UPDATE foto_comprobante/)).toHaveLength(0);
    expect((await pedir(app, "POST", "/compras", { cuerpo: compra({ foto: "../otra.jpg" }) })).status).toBe(400);
  });
});
