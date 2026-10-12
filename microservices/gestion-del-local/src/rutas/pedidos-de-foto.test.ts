import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

const conFoto = (tipo = "image/jpeg") => { const f = new FormData(); f.append("foto", new File(["bytes de la foto"], "foto.jpg", { type: tipo })); return f; };
const pedirUna = async () => ((await (await pedir(app, "POST", "/pedidos-de-foto", { rol: "admin", cuerpo: { para: "la factura del ingreso" } })).json()) as { codigo: string }).codigo;

// La foto que la computadora le pide al celular con un código QR (RF-50, RF-09, RF-80).
describe("pedidos de foto", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("sin sesión no se pide, no se manda ni se retira", async () => {
    expect((await pedir(app, "POST", "/pedidos-de-foto", { rol: null, cuerpo: {} })).status).toBe(401);
    expect((await pedir(app, "POST", "/pedidos-de-foto/x/foto", { rol: null, formulario: conFoto() })).status).toBe(401);
    expect((await pedir(app, "GET", "/pedidos-de-foto/x/foto", { rol: null })).status).toBe(401);
  });

  it("la computadora pide, el celular manda y la computadora retira la misma foto, una sola vez", async () => {
    const codigo = await pedirUna();
    expect(await (await pedir(app, "GET", `/pedidos-de-foto/${codigo}`, { rol: "mostrador" })).json()).toEqual({ para: "la factura del ingreso", lista: false });
    expect((await pedir(app, "GET", `/pedidos-de-foto/${codigo}/foto`)).status).toBe(404);
    expect((await pedir(app, "POST", `/pedidos-de-foto/${codigo}/foto`, { rol: "mostrador", formulario: conFoto() })).status).toBe(201);
    expect(await (await pedir(app, "GET", `/pedidos-de-foto/${codigo}`)).json()).toEqual({ para: "la factura del ingreso", lista: true });
    const r = await pedir(app, "GET", `/pedidos-de-foto/${codigo}/foto`, { rol: "admin" });
    expect(r.status).toBe(200);
    expect(r.headers.get("Content-Type")).toBe("image/jpeg");
    expect(await r.text()).toBe("bytes de la foto");
    expect((await pedir(app, "GET", `/pedidos-de-foto/${codigo}`)).status).toBe(404);
  });

  it("un código que no existe no sirve, y lo que no es una imagen se rechaza", async () => {
    expect((await pedir(app, "GET", "/pedidos-de-foto/no-existe")).status).toBe(404);
    expect((await pedir(app, "POST", "/pedidos-de-foto/no-existe/foto", { formulario: conFoto() })).status).toBe(404);
    const codigo = await pedirUna();
    expect((await pedir(app, "POST", `/pedidos-de-foto/${codigo}/foto`, { formulario: conFoto("application/pdf") })).status).toBe(400);
    expect((await pedir(app, "POST", `/pedidos-de-foto/${codigo}/foto`, { formulario: new FormData() })).status).toBe(400);
  });

  it("un pedido vence a los diez minutos", async () => {
    vi.useFakeTimers();
    try {
      const codigo = await pedirUna();
      vi.advanceTimersByTime(11 * 60_000);
      expect((await pedir(app, "GET", `/pedidos-de-foto/${codigo}`)).status).toBe(404);
    } finally { vi.useRealTimers(); }
  });

  // Decisión 58: el celular emparejado se entera solo de que su computadora espera una foto.
  it("el celular emparejado ve el pedido de su computadora sin leer el código; uno que no lo está, no", async () => {
    const codigo = await pedirUna(); // lo pide la sesión «sesion-admin»
    expect(await (await pedir(app, "GET", "/pedidos-de-foto/para-mi", { rol: "mostrador" })).json()).toEqual([]);
    base.actual.programar(/SELECT sesion_id FROM puesto WHERE celular_sesion_id/, (params) => ({ rows: params[0] === "sesion-mostrador" ? [{ sesion_id: "sesion-admin" }] : [] }));
    expect(await (await pedir(app, "GET", "/pedidos-de-foto/para-mi", { rol: "mostrador" })).json()).toEqual([{ codigo, para: "la factura del ingreso" }]);
    expect(await (await pedir(app, "GET", "/pedidos-de-foto/para-mi", { rol: "soloVende" })).json()).toEqual([]);
    // Una vez mandada la foto, deja de figurar.
    await pedir(app, "POST", `/pedidos-de-foto/${codigo}/foto`, { rol: "mostrador", formulario: conFoto() });
    expect(await (await pedir(app, "GET", "/pedidos-de-foto/para-mi", { rol: "mostrador" })).json()).toEqual([]);
  });
});
