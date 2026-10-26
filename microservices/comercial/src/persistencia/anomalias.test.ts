import { describe, expect, it } from "vitest";
import { pagina } from "./anomalias.js";
import { base } from "./conexion.js";
import { producto, usuario, venta } from "./pruebas/datos.js";

describe("las anomalías", () => {
  it("de a páginas, las más nuevas primero, con el producto y quién", async () => {
    const p = await producto({ descripcion: "Mecha 8", unidad: "unidad" });
    const ana = await usuario({ nombre: "Ana" });
    const v = await venta();
    await base.insertInto("anomalia").values([
      { id: crypto.randomUUID(), tipo: "venta_sin_stock", producto_id: p, usuario_id: ana, usuario_nombre: "Ana", venta_id: v, cantidad: 2, detalle: "vieja", creado_en: new Date("2026-10-01") },
      { id: crypto.randomUUID(), tipo: "devuelto_fallado", producto_id: p, usuario_id: null, venta_id: null, cantidad: 1, detalle: "nueva", creado_en: new Date("2026-10-02") },
    ]).execute();
    const filas = await pagina(base, 10, 0);
    expect(filas.map((f) => [f.detalle, f.producto, f.usuario])).toEqual([["nueva", "Mecha 8", null], ["vieja", "Mecha 8", "Ana"]]);
    expect((await pagina(base, 1, 1)).map((f) => f.detalle)).toEqual(["vieja"]);
  });
});
