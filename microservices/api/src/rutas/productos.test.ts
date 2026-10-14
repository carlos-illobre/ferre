import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

describe("GET /productos", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("sin `limite` pide el catálogo entero; con `limite` y `desde`, solo esa tanda y en orden estable", async () => {
    await pedir(app, "GET", "/productos");
    await pedir(app, "GET", "/productos?limite=60&desde=120");
    const [entero, tanda] = base.actual.consultas.filter((q) => /FROM producto p/.test(q.sql));
    expect(entero!.sql).not.toMatch(/OFFSET/);
    expect(tanda!.sql).toMatch(/ORDER BY p\.descripcion, p\.id LIMIT \$1 OFFSET \$2/);
    expect(tanda!.params).toEqual([60, 120]);
  });

  it("un `limite` que no es un número se ignora", async () => {
    await pedir(app, "GET", "/productos?limite=abc");
    expect(base.actual.consultas.find((q) => /FROM producto p/.test(q.sql))!.sql).not.toMatch(/OFFSET/);
  });
});

describe("el precio que manda el servidor (010-E06)", () => {
  it("cada producto llega con su precio calculado, su explicación y el de los cinco márgenes", async () => {
    const { conPrecio } = await import("./productos.js");
    const p = conPrecio({ id: "a", costo_neto: "1649.14", iva: "0.21", margen_elegido: 100 });
    expect(p.precio).toBe(4000);
    expect(p.margen_del_precio).toBe(100);
    expect(p.explicacion_precio).toEqual(["Costo $1.649,14", "+ 100 % de margen = $3.298,28", "+ IVA 21 % = $3.990,92", "Redondeado para arriba a $4.000,00 (múltiplo de $1.000,00)"]);
    expect(p.precios).toEqual({ 300: 8000, 200: 6000, 100: 4000, 50: 3000, 25: 3000 });
  });
  it("sin margen llegan solo los de los botones; sin costo, ningún precio", async () => {
    const { conPrecio } = await import("./productos.js");
    expect(conPrecio({ costo_neto: "1000", iva: null, margen_elegido: null })).toMatchObject({ precio: null, explicacion_precio: [], margen_del_precio: null, precios: { 100: 3000 } });
    expect(conPrecio({ costo_neto: null, iva: null, margen_elegido: 100 })).toMatchObject({ precio: null, precios: null });
  });
  it("la ruta los agrega a cada producto del catálogo", async () => {
    base.actual = baseFalsa();
    base.actual.programar(/FROM producto p/, { rows: [{ id: "a", costo_neto: "1000", iva: "0.21", margen_elegido: 50 }] });
    const r = await pedir(app, "GET", "/productos");
    expect((await r.json())[0]).toMatchObject({ id: "a", precio: 2000, margen_del_precio: 50 });
  });
});

describe("PATCH /productos/:id", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/UPDATE producto SET/, { rowCount: 1 }); });

  it("buscar, traer por código y traer por lista de productos: filtros que van como parámetros (RF-85)", async () => {
    await pedir(app, "GET", "/productos?buscar=" + encodeURIComponent("Mechá 8mm'; DROP TABLE producto;--") + "&limite=60", { rol: "mostrador" });
    const busqueda = base.actual.sqlDe(/FROM producto p/).at(-1)!;
    // Cada palabra, normalizada, es un parámetro; nada del texto queda pegado en la consulta.
    expect(busqueda.params).toEqual(["mecha", "8mm", "drop", "table", "producto", 60, 0]);
    expect(busqueda.sql).not.toMatch(/DROP TABLE/i);
    expect(busqueda.sql).toMatch(/LIKE '% ' \|\| \$1 \|\| '%'/);
    expect(busqueda.sql).toMatch(/ORDER BY length\(p\.descripcion\), p\.descripcion, p\.id LIMIT \$6 OFFSET \$7/);

    await pedir(app, "GET", "/productos?codigo=7790250000358", { rol: "mostrador" });
    const porCodigo = base.actual.sqlDe(/FROM producto p/).at(-1)!;
    expect(porCodigo.params).toEqual(["7790250000358"]);
    expect(porCodigo.sql).toMatch(/p\.codigo_barras = \$1 OR EXISTS/);

    const id = "00000000-0000-0000-0000-0000000e5e02";
    await pedir(app, "GET", `/productos?ids=${id},no-es-un-id`, { rol: "mostrador" });
    const porIds = base.actual.sqlDe(/FROM producto p/).at(-1)!;
    expect(porIds.params).toEqual([[id]]);
    expect(porIds.sql).toMatch(/p\.id = ANY\(\$1::uuid\[\]\)/);
    // Una lista vacía no trae el catálogo entero: no trae nada.
    await pedir(app, "GET", "/productos?ids=", { rol: "mostrador" });
    expect(base.actual.sqlDe(/FROM producto p/).at(-1)!.params).toEqual([[]]);
    expect((await pedir(app, "GET", "/productos?buscar=mecha", { rol: null })).status).toBe(401);
  });

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
