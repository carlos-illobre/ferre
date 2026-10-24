import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import * as datos from "./pedidos.js";
import { precio, producto, proveedor, usuario } from "./pruebas/datos.js";

// Pedidos a proveedores (005).
describe("los pedidos", () => {
  it("se crean en borrador con renglones al costo estimado, cambian de proveedor y se borran solo en borrador", async () => {
    const [comodo, erpa] = [await proveedor({ nombre: "Comodo", whatsapp: "11" }), await proveedor({ activo: false })];
    expect(await datos.proveedorActivo(base, comodo)).toBe(true);
    expect(await datos.proveedorActivo(base, erpa)).toBe(false);
    const ana = await usuario();
    const p = await producto({ descripcion: "Cinta" });
    await precio(p, comodo, { codigo_proveedor: "CI-1", costo_neto: 80, fecha_lista: "2026-09-01" });
    await precio(p, comodo, { codigo_proveedor: "CI-1", costo_neto: 90, fecha_lista: "2026-10-01" });
    const id = crypto.randomUUID();
    await datos.crear(base, id, erpa, ana);
    await datos.cambiarProveedor(base, id, comodo);
    await datos.reemplazarRenglones(base, id, comodo, [{ producto_id: p, cantidad: 2 }]);
    await datos.reemplazarRenglones(base, id, comodo, [{ producto_id: p, cantidad: 3 }]);
    expect(await datos.uno(base, id)).toMatchObject({ estado: "borrador", proveedor: "Comodo", whatsapp: "11", items: [{ descripcion: "Cinta", codigo_proveedor: "CI-1", cantidad: 3, costo_estimado: 90 }] });
    expect(await datos.uno(base, crypto.randomUUID())).toBeNull();
    expect(await datos.estadoTrabado(base, id)).toBe("borrador");
    expect(await datos.estadoTrabado(base, crypto.randomUUID())).toBeNull();
    expect(await datos.borrarBorrador(base, id)).toBe(true);
    expect(await datos.borrarBorrador(base, id)).toBe(false);
  });

  it("se mandan, se guarda el WhatsApp, pasan de estado y se listan por estado", async () => {
    const prov = await proveedor({ nombre: "ZZ Ixnova" });
    const ana = await usuario({ nombre: "Ana" });
    const id = crypto.randomUUID();
    await datos.crear(base, id, prov, ana);
    await datos.reemplazarRenglones(base, id, prov, [{ producto_id: await producto(), cantidad: 1 }]);
    expect(await datos.paraMandar(base, id)).toEqual({ estado: "borrador", proveedor_id: prov, proveedor: "ZZ Ixnova", renglones: "1" });
    expect(await datos.paraMandar(base, crypto.randomUUID())).toBeNull();
    await datos.marcarEnviado(base, id, ana);
    await datos.guardarWhatsapp(base, prov, "1155");
    expect(await datos.uno(base, id)).toMatchObject({ estado: "enviado", enviado_por: "Ana", whatsapp: "1155", items: [{ costo_estimado: null }] });
    expect((await datos.lista(base, ["enviado"])).map((x) => x.id)).toContain(id);
    expect((await datos.lista(base, ["cancelado"])).map((x) => x.id)).not.toContain(id);
    expect(await datos.pasarDeEstado(base, id, "borrador", "cancelado", ana)).toBe(false);
    expect(await datos.pasarDeEstado(base, id, "enviado", "cancelado", ana)).toBe(true);
    expect((await datos.lista(base, null)).find((x) => x.id === id)).toMatchObject({ estado: "cancelado", cerrado_por: "Ana" });
  });
});
