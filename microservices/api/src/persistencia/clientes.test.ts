import { describe, expect, it } from "vitest";
import { activosConDeuda, insertar } from "./clientes.js";
import { base } from "./conexion.js";
import { venta } from "./pruebas/datos.js";

describe("los clientes", () => {
  it("la deuda es lo vendido a cuenta corriente sin pagar, más las diferencias de sus cambios en la cuenta", async () => {
    const ana = await insertar(base, { nombre: "Ana", telefono: "11", cuenta_corriente: true });
    const beto = await insertar(base, { nombre: "Beto", telefono: null, cuenta_corriente: false });
    const debe = await venta({ medio_pago: "cuenta_corriente", cliente_id: ana, total: 1000 });
    await venta({ medio_pago: "cuenta_corriente", cliente_id: ana, total: 500, pagada_en: new Date() });
    await venta({ medio_pago: "cuenta_corriente", cliente_id: ana, total: 300, estado: "anulada" });
    const cambio = crypto.randomUUID();
    await base.insertInto("cambio").values({ id: cambio, venta_id: debe, fecha: new Date(), diferencia: 200, resuelto: "cuenta_corriente" }).execute();
    await base.insertInto("movimiento_dinero").values({ id: crypto.randomUUID(), fecha: new Date(), tipo: "cobro_diferencia", medio_pago: "cuenta_corriente", importe: 200, venta_id: debe, cliente_id: ana, cambio_id: cambio }).execute();
    await base.insertInto("cliente").values({ id: crypto.randomUUID(), nombre: "Inactivo", activo: false }).execute();
    const filas = await activosConDeuda(base);
    expect(filas.map((f) => [f.nombre, Number(f.deuda)])).toEqual([["Ana", 1200], ["Beto", 0]]);
    expect(filas[1]!.id).toBe(beto);
  });
});
