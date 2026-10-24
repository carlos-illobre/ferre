import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import * as datos from "./conteos.js";
import { stockDe } from "./deposito.js";
import { movimiento, producto, usuario } from "./pruebas/datos.js";
import { enTransaccion } from "./transaccion.js";

// Sectores y conteos del depósito (005).
describe("los conteos", () => {
  it("un sector nuevo va al final; su conteo abierto se ve en la lista", async () => {
    const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
    await datos.insertarSector(base, a, "ZZ Pasillo 1");
    await datos.insertarSector(base, b, "ZZ Pasillo 2");
    await producto({ sector_id: a });
    await producto({ sector_id: a, activo: false });
    const conteo = crypto.randomUUID();
    await datos.abrirConteo(base, conteo, a, await usuario());
    const sectores = await datos.sectores(base);
    const [uno, dos] = [sectores.find((s) => s.id === a)!, sectores.find((s) => s.id === b)!];
    expect(dos.orden).toBe(uno.orden + 1);
    expect(uno).toMatchObject({ productos: "1", conteo_abierto: conteo, ultimo_conteo: null });
    expect(await datos.conteoAbiertoDe(base, a)).toBe(conteo);
    expect(await datos.conteoAbiertoDe(base, b)).toBeNull();
  });

  it("contar, corregir y descontar; lo que falta contar; y cerrar una sola vez con sus ajustes", async () => {
    const sector = crypto.randomUUID();
    await datos.insertarSector(base, sector, "ZZ Depósito");
    const ana = await usuario();
    const [mecha, tornillo] = [await producto({ descripcion: "Mecha", sector_id: sector }), await producto({ descripcion: "Tornillo" })];
    await movimiento(mecha, 10);
    const id = crypto.randomUUID();
    await datos.abrirConteo(base, id, sector, ana);
    expect(await datos.cabecera(base, id)).toMatchObject({ estado: "abierto", sector: "ZZ Depósito" });
    expect(await datos.cabecera(base, crypto.randomUUID())).toBeNull();
    expect(await datos.sectorDelConteoAbierto(base, id)).toBe(sector);
    expect((await datos.sinContar(base, id, sector)).map((p) => [p.descripcion, p.stock_teorico])).toEqual([["Mecha", "10.000"]]);
    await datos.contar(base, id, tornillo, 3, ana, sector);
    await datos.contar(base, id, tornillo, 4, ana, sector);
    await datos.contar(base, id, mecha, 8, ana, sector);
    expect((await datos.contados(base, id)).map((r) => [r.descripcion, r.cantidad_contada])).toEqual(expect.arrayContaining([["Tornillo", "4.000"], ["Mecha", "8.000"]]));
    await datos.descontar(base, id, tornillo);
    expect(await datos.contadosParaCerrar(base, id)).toEqual([{ producto_id: mecha, cantidad_contada: "8.000", stock_teorico: "10.000" }]);
    expect(await datos.sinContarParaCerrar(base, id, sector)).toEqual([{ id: tornillo, stock_teorico: "0" }]);
    await enTransaccion(async (trx) => {
      expect(await datos.abiertoParaCerrar(trx, id)).toEqual({ sector_id: sector, sector: "ZZ Depósito" });
      await datos.ajuste(trx, mecha, -2, id, "conteo");
      await datos.marcarCerrado(trx, id, ana, { ajustes: 1 });
    });
    expect(await stockDe(base, mecha)).toBe(8);
    expect(await datos.abiertoParaCerrar(base, id)).toBeNull();
    expect(await datos.sectorDelConteoAbierto(base, id)).toBeNull();
    expect(await datos.cabecera(base, id)).toMatchObject({ estado: "cerrado", resumen: { ajustes: 1 } });
    await datos.descontar(base, id, mecha);
    expect(await datos.contadosParaCerrar(base, id)).toHaveLength(1);
  });
});
