import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

describe("GET /auditoria", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    base.actual.programar(/count\(\*\) as "total" from "evento"/, { rows: [{ total: "120" }] });
    base.actual.programar(/select "e"\."id", "e"\."tipo"/, { rows: [{ id: "e1", tipo: "venta.registrada" }] });
  });

  it("solo la ven el dueño y el admin", async () => {
    expect((await pedir(app, "GET", "/auditoria", { rol: "mostrador" })).status).toBe(403);
    expect((await pedir(app, "GET", "/auditoria", { rol: "admin" })).status).toBe(200);
  });

  it("va de a 10 por página y dice cuántas acciones hay", async () => {
    const r = await pedir(app, "GET", "/auditoria?pagina=3");
    expect(await r.json()).toEqual({ eventos: [{ id: "e1", tipo: "venta.registrada" }], total: 120, pagina: 3, por_pagina: 10 });
    // El tamaño de la página y desde dónde van como parámetros: 10 y 20.
    expect(base.actual.sqlDe(/select "e"\."id"/)[0]!.params.slice(-2)).toEqual([10, 20]);
    await pedir(app, "GET", "/auditoria?pagina=abc");
    expect(base.actual.sqlDe(/select "e"\."id"/)[1]!.params.slice(-2)).toEqual([10, 0]);
  });
});
