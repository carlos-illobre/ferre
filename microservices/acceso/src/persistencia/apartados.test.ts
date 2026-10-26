import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { hashear } from "./acceso.js";
import * as datos from "./apartados.js";
import { base } from "./conexion.js";
import { enTransaccion } from "./transaccion.js";
import { sesion, usuario } from "./pruebas/datos.js";

// Lo apartado de alguien desactivado (014, ADR-021).
describe("lo apartado", () => {
  it("la sesión de un token sirve hasta 30 días después de cerrada", async () => {
    const ana = await usuario({ activo: false });
    await sesion(ana, "vigente");
    await sesion(ana, "cerrada-hace-poco", { revocada_en: sql<Date>`now() - interval '2 days'` as never });
    await sesion(ana, "cerrada-hace-mucho", { revocada_en: sql<Date>`now() - interval '40 days'` as never });
    expect(await datos.sesionDelToken(base, hashear("vigente"))).toMatchObject({ usuario_id: ana, activo: false });
    expect(await datos.sesionDelToken(base, hashear("cerrada-hace-poco"))).not.toBeNull();
    expect(await datos.sesionDelToken(base, hashear("cerrada-hace-mucho"))).toBeNull();
  });

  it("guarda cada cambio una sola vez y lista lo pendiente con su producto", async () => {
    const ana = await usuario({ nombre: "Ana" });
    const s = await sesion(ana);
    const p = crypto.randomUUID(); // un producto de Comercial: acá solo su identificador
    const cambios = [
      { orden: 1, tipo: "venta", metodo: "POST" as const, ruta: "/ventas", cuerpo: { total: 1 }, creado_en: "2026-10-01T10:00:00Z" },
      { orden: 2, tipo: "margen", metodo: "PATCH" as const, ruta: `/productos/${p}`, cuerpo: undefined, creado_en: "no es una fecha" },
    ];
    await datos.apartar(base, { id: s, usuario_id: ana }, cambios);
    await datos.apartar(base, { id: s, usuario_id: ana }, cambios);
    const pendientes = await datos.pendientes(base);
    expect(pendientes.map((a) => [a.tipo, a.usuario, a.producto_id, a.cuerpo])).toEqual([["venta", "Ana", null, { total: 1 }], ["margen", "Ana", p, null]]);
  });

  it("se decide una sola vez, y anota el error si lo hubo", async () => {
    const ana = await usuario();
    const beto = await usuario({ nombre: "Beto" });
    await datos.apartar(base, { id: await sesion(ana), usuario_id: ana }, [{ orden: 1, tipo: "venta", metodo: "POST", ruta: "/ventas", cuerpo: {}, creado_en: "2026-10-01T10:00:00Z" }]);
    const { id } = (await datos.pendientes(base)).at(-1)!;
    await datos.anotarError(base, id, "no se pudo");
    expect((await datos.pendientes(base)).find((a) => a.id === id)!.error).toBe("no se pudo");
    await enTransaccion(async (trx) => {
      expect(await datos.paraDecidir(trx, id)).toMatchObject({ decision: null, decidido_por: null });
      await datos.decidir(trx, id, "aceptado", beto);
    });
    expect(await datos.paraDecidir(base, id)).toMatchObject({ decision: "aceptado", decidido_por: "Beto" });
    expect((await datos.pendientes(base)).find((a) => a.id === id)).toBeUndefined();
  });

});
