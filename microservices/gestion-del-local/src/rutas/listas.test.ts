import { beforeEach, describe, expect, it, vi } from "vitest";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// "lista del ..." en Productos baja el Excel original del proveedor.
describe("GET /listas/:id/archivo", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("devuelve el archivo original con su nombre", async () => {
    const ruta = path.join(process.env.CARPETA_LISTAS!, "lista-prueba.xlsx");
    await writeFile(ruta, "contenido-excel");
    base.actual.programar(/SELECT archivo_nombre, archivo_ruta FROM lista_importada/, { rows: [{ archivo_nombre: "Lista Ixnova agosto.xlsx", archivo_ruta: ruta }] });
    const r = await pedir(app, "GET", "/listas/l1/archivo", { rol: "mostrador" });
    expect(r.status).toBe(200);
    expect(r.headers.get("content-disposition")).toContain('filename="Lista Ixnova agosto.xlsx"');
    expect(await r.text()).toBe("contenido-excel");
  });

  it("404 si la lista no existe, no guardó el archivo o el archivo ya no está", async () => {
    expect((await pedir(app, "GET", "/listas/l1/archivo")).status).toBe(404);
    base.actual.programar(/SELECT archivo_nombre, archivo_ruta/, { rows: [{ archivo_nombre: "x.xlsx", archivo_ruta: null }] });
    expect((await pedir(app, "GET", "/listas/l1/archivo")).status).toBe(404);
    base.actual.programar(/SELECT archivo_nombre, archivo_ruta/, { rows: [{ archivo_nombre: "x.xlsx", archivo_ruta: "/no/existe.xlsx" }] });
    expect((await pedir(app, "GET", "/listas/l1/archivo")).status).toBe(404);
    expect((await pedir(app, "GET", "/listas/l1/archivo", { rol: null })).status).toBe(401);
  });
});
