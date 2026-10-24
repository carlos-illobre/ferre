import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";
import { horaDeLectura } from "../productos/reglas.js";

// Lo que la ficha del producto renovada pide al servidor (specs/016): la última lectura del
// código de barras y el archivo de origen del costo.
const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

describe("la última lectura del código (RF-112)", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/UPDATE producto SET/, { rowCount: 1 }); });

  it("016-E09: cargar el código guarda la hora en que se leyó, la del dispositivo, y queda en el registro", async () => {
    const r = await pedir(app, "PATCH", "/productos/p1", { rol: "soloVende", cuerpo: { codigo_barras: "7791234000004", codigo_leido_en: "2026-10-13T13:24:00.000Z" } });
    expect(r.status).toBe(204);
    const update = base.actual.sqlDe(/UPDATE producto SET/).at(-1)!;
    expect(update.sql).toMatch(/codigo_barras = \$1, codigo_leido_en = \$2/);
    expect(update.params).toEqual(["7791234000004", "2026-10-13T13:24:00.000Z", "p1"]);
    expect(base.actual.sqlDe(/insert into "evento"/).at(-1)!.params.join(" ")).toContain("2026-10-13T13:24:00.000Z");
  });

  it("016-E09: sin hora, o con una en el futuro o anterior al sistema, vale la del servidor", () => {
    const ahora = new Date("2026-10-17T12:00:00Z");
    expect(horaDeLectura("779", undefined, ahora)).toBe(ahora.toISOString());
    expect(horaDeLectura("779", "2026-10-18T12:00:00Z", ahora)).toBe(ahora.toISOString());
    expect(horaDeLectura("779", "2020-01-01T00:00:00Z", ahora)).toBe(ahora.toISOString());
    // Sin conexión vale la hora de la lectura, aunque el cambio llegue horas después.
    expect(horaDeLectura("779", "2026-10-17T08:00:00-03:00", ahora)).toBe("2026-10-17T11:00:00.000Z");
  });

  it("016-E11: borrar el código borra la última lectura; la hora sola, sin código, no se acepta", async () => {
    await pedir(app, "PATCH", "/productos/p1", { cuerpo: { codigo_barras: null } });
    expect(base.actual.sqlDe(/UPDATE producto SET/).at(-1)!.params).toEqual([null, null, "p1"]);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { codigo_leido_en: "2026-10-13T13:24:00Z" } })).status).toBe(400);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { codigo_barras: "779123", codigo_leido_en: "ayer" } })).status).toBe(400);
  });

  it("016-E10: otro cambio del producto (el margen) no toca la última lectura", async () => {
    await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: 100 } });
    expect(base.actual.sqlDe(/UPDATE producto SET/).at(-1)!.sql).not.toMatch(/codigo_leido_en/);
  });

  it("016-E10: el catálogo trae la última lectura de cada producto", async () => {
    const { leerCatalogoEntero } = await import("../persistencia/productos.js");
    base.actual.programar(/pg_snapshot_xmin/, { rows: [{ marca: "10", tope: "12" }] });
    await leerCatalogoEntero();
    expect(base.actual.sqlDe(/FROM producto p/).at(-1)!.sql).toMatch(/p\.codigo_leido_en/);
  });
});

describe("el archivo de origen del costo (RF-115)", () => {
  const LISTA = "6a1d0c34-6f1e-4c55-9f0b-1a2b3c4d5e6f";
  beforeEach(() => { base.actual = baseFalsa(); });

  it("016-E22: el nombre del archivo, el proveedor, la fecha y cuántos productos cargó", async () => {
    base.actual.programar(/FROM lista_importada l JOIN proveedor/, { rows: [{ id: LISTA, archivo_nombre: "lista_comodo_05-09-2026.xlsx", proveedor: "Comodo", fecha_lista: "2026-09-05", productos: 7096 }] });
    const r = await pedir(app, "GET", `/listas/${LISTA}/origen`, { rol: "mostrador" });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ id: LISTA, archivo_nombre: "lista_comodo_05-09-2026.xlsx", proveedor: "Comodo", fecha_lista: "2026-09-05", productos: 7096 });
    expect(base.actual.sqlDe(/FROM lista_importada l/).at(-1)!.params).toEqual([LISTA]);
  });

  it("016-E21: lo ve quien ve costos; sin ese permiso, 403; sin sesión, 401", async () => {
    expect((await pedir(app, "GET", `/listas/${LISTA}/origen`, { rol: "soloVende" })).status).toBe(403);
    expect((await pedir(app, "GET", `/listas/${LISTA}/origen`, { rol: null })).status).toBe(401);
  });

  it("016-E24: una lista que no existe, o un id que no es de una lista, 404 sin preguntarle a la base", async () => {
    expect((await pedir(app, "GET", `/listas/${LISTA}/origen`, { rol: "mostrador" })).status).toBe(404);
    const antes = base.actual.sqlDe(/FROM lista_importada l/).length;
    expect((await pedir(app, "GET", "/listas/no-es-un-id'--/origen", { rol: "mostrador" })).status).toBe(404);
    expect(base.actual.sqlDe(/FROM lista_importada l/)).toHaveLength(antes);
  });
});
