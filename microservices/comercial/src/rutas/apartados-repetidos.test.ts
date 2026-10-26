import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

// Lo apartado lo decide Acceso; al aceptarlo, repite acá el pedido con `X-Apartado` (specs/029), y
// Comercial revisa antes lo suyo (014-E08).
const PRODUCTO = "00000000-0000-0000-0000-0000000000c1";
const VENTA = { id: "00000000-0000-0000-0000-0000000000d1", medio_pago: "efectivo", items: [{ producto_id: PRODUCTO, descripcion: "Tornillo 8x1", cantidad: 3, precio_unitario: 1400 }] };
const apartado = { "X-Apartado": "1" };

describe("lo apartado que se repite en Comercial", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("014-E08 029-E07: una venta de un producto que se unió con otro no se registra y dice con cuál", async () => {
    base.actual.programar(/FROM producto p LEFT JOIN producto r ON r.id = p.reemplazado_por/, (p) => ({ rows: (p[0] as string[]).includes(PRODUCTO) ? [{ descripcion: "Tornillo 8x1", reemplazo: "Tornillo autoperf. 8x1 punta mecha" }] : [] }));
    const r = await pedir(app, "POST", "/ventas", { rol: "cajero", cuerpo: VENTA, cabeceras: apartado });
    expect([r.status, await r.json()]).toEqual([409, { error: "«Tornillo 8x1» se unió con «Tornillo autoperf. 8x1 punta mecha». Si querés, descartalo y cargalo de nuevo" }]);
    expect(base.actual.sqlDe(/insert into "venta"/)).toHaveLength(0);
  });

  it("014-E08: un ajuste de un producto dado de baja tampoco; en un conteo cuenta el producto, no el conteo", async () => {
    base.actual.programar(/FROM producto p LEFT JOIN producto r ON r.id = p.reemplazado_por/, (p) => ({ rows: (p[0] as string[]).includes(PRODUCTO) ? [{ descripcion: "Tornillo 8x1", reemplazo: null }] : [] }));
    const ajuste = await pedir(app, "POST", `/stock/${PRODUCTO}/ajustes`, { rol: "dueño", cuerpo: { cantidad_real: 2 }, cabeceras: apartado });
    expect([ajuste.status, ((await ajuste.json()) as { error: string }).error]).toEqual([409, "«Tornillo 8x1» se dio de baja. Si querés, descartalo y cargalo de nuevo"]);
    const conteo = await pedir(app, "PUT", `/conteos/${PRODUCTO.replace("c1", "e1")}/renglones/${PRODUCTO}`, { rol: "dueño", cuerpo: { cantidad: 2 }, cabeceras: apartado });
    expect(conteo.status).toBe(409);
    expect(base.actual.sqlDe(/FROM producto p LEFT JOIN producto r/).at(-1)!.params[0]).toEqual([PRODUCTO]);
  });

  it("si sus productos siguen, o no toca productos, o no es apartado, sigue como siempre", async () => {
    expect((await pedir(app, "POST", "/ventas", { rol: "cajero", cuerpo: VENTA, cabeceras: apartado })).status).toBe(201);
    expect((await pedir(app, "POST", "/ventas", { rol: "cajero", cuerpo: { ...VENTA, id: VENTA.id.replace("d1", "d2"), items: [{ descripcion: "Algo suelto", cantidad: 1, precio_unitario: 10 }] }, cabeceras: apartado })).status).toBe(201);
    expect((await pedir(app, "DELETE", "/clientes/x", { rol: "dueño", cabeceras: apartado })).status).not.toBe(409);
    base.actual.programar(/FROM producto p LEFT JOIN producto r ON r.id = p.reemplazado_por/, { rows: [{ descripcion: "Tornillo 8x1", reemplazo: null }] });
    expect((await pedir(app, "POST", "/ventas", { rol: "cajero", cuerpo: { ...VENTA, id: VENTA.id.replace("d1", "d3") } })).status).toBe(201);
  });
});
