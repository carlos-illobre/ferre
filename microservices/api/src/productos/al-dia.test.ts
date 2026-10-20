import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

// Quien cambia el catálogo lo ve en su pedido siguiente (specs/018, RF-124): antes de contestar,
// la copia del servidor lee lo que cambió; sin esperar el aviso de la base.
const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
const copia = vi.hoisted(() => ({ ponerAlDia: vi.fn(async () => undefined) }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
vi.mock("./copia.js", async (original) => ({ ...(await original<typeof import("./copia.js")>()), iniciada: () => true, ponerAlDia: copia.ponerAlDia }));
const { app } = await import("../app.js");

describe("la copia, al día para quien cambia", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/UPDATE producto SET/, { rowCount: 1 }); copia.ponerAlDia.mockClear(); });

  it("018-E08 018-E16: cambiar un producto pone la copia al día antes de contestar", async () => {
    let alContestar = -1;
    copia.ponerAlDia.mockImplementationOnce(async () => { alContestar = copia.ponerAlDia.mock.calls.length; });
    const r = await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: 50 } });
    expect(r.status).toBe(204);
    expect(alContestar).toBe(1);
  });

  it("un cambio rechazado, una lectura o algo que no es del catálogo no la tocan", async () => {
    await pedir(app, "PATCH", "/productos/p1", { rol: "soloVende", cuerpo: { margen_elegido: 50 } });
    await pedir(app, "GET", "/productos/marcas", { rol: "mostrador" });
    await pedir(app, "POST", "/ventas", { rol: "mostrador", cuerpo: {} });
    expect(copia.ponerAlDia).not.toHaveBeenCalled();
  });
});
