import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

describe("PATCH /productos/:id", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/UPDATE producto SET/, { rowCount: 1 }); });

  it("sin sesión, 401", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { rol: null, cuerpo: { margen_elegido: 100 } })).status).toBe(401);
  });

  it("el margen es cualquier porcentaje entero mayor que cero, o ninguno", async () => {
    for (const m of [100, 20, 1, 10000, null]) {
      const r = await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: m } });
      expect(r.status, `margen ${m}`).toBe(204);
    }
    for (const m of [1.5, 0, -10, 10001, "20"]) {
      const r = await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: m } });
      expect(r.status, `margen ${m}`).toBe(400);
    }
    const update = base.actual.sqlDe(/UPDATE producto SET margen_elegido/)[0]!;
    expect(update.params).toEqual(["p1", 100]);
  });

  it("la unidad es unidad, kg, m o l", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { unidad: "kg" } })).status).toBe(204);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { unidad: "caja" } })).status).toBe(400);
  });

  it("la foto es una dirección https o una subida a la API", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { foto_url: "https://fotos/x.jpg" } })).status).toBe(204);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { foto_url: "/fotos/abc.jpg" } })).status).toBe(204);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { foto_url: "javascript:alert(1)" } })).status).toBe(400);
  });

  it("sin nada que cambiar, 400; producto inexistente, 404; y queda auditado", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: {} })).status).toBe(400);
    base.actual.programar(/UPDATE producto SET/, { rowCount: 0 });
    expect((await pedir(app, "PATCH", "/productos/nadie", { cuerpo: { margen_elegido: 50 } })).status).toBe(404);
    base.actual.programar(/UPDATE producto SET/, { rowCount: 1 });
    await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: 50 } });
    const evento = base.actual.sqlDe(/INSERT INTO evento/).at(-1)!;
    expect(evento.params[1]).toBe("producto.precio_elegido");
    expect(evento.params[4]).toBe("u-mostrador");
  });
});

describe("fotos de productos", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("se sube desde el celular, se guarda con nombre al azar y se sirve sin sesión", async () => {
    base.actual.programar(/UPDATE producto SET foto_url/, { rowCount: 1 });
    const formulario = new FormData();
    formulario.append("foto", new File([Buffer.from("imagen-de-prueba")], "foto.jpg", { type: "image/jpeg" }));
    const r = await pedir(app, "POST", "/productos/p1/foto", { rol: "mostrador", formulario });
    expect(r.status).toBe(200);
    const { foto_url } = (await r.json()) as { foto_url: string };
    expect(foto_url).toMatch(/^\/fotos\/[0-9a-f-]{36}\.jpg$/);
    expect(await readFile(path.join(process.env.CARPETA_LISTAS!, "fotos", path.basename(foto_url)), "utf8")).toBe("imagen-de-prueba");
    const servida = await pedir(app, "GET", foto_url, { rol: null });
    expect(servida.status).toBe(200);
    expect(servida.headers.get("content-type")).toBe("image/jpeg");
    expect(await servida.text()).toBe("imagen-de-prueba");
  });

  it("rechaza lo que no es una imagen y nombres raros", async () => {
    const formulario = new FormData();
    formulario.append("foto", new File(["x"], "virus.exe", { type: "application/octet-stream" }));
    expect((await pedir(app, "POST", "/productos/p1/foto", { formulario })).status).toBe(400);
    expect((await pedir(app, "POST", "/productos/p1/foto", { formulario: new FormData() })).status).toBe(400);
    expect((await pedir(app, "GET", "/fotos/../../.env", { rol: null })).status).toBe(404);
    expect((await pedir(app, "GET", "/fotos/00000000-0000-0000-0000-000000000000.jpg", { rol: null })).status).toBe(404);
  });
});
