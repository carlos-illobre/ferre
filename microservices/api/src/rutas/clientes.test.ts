import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

const error = async (r: Response) => ((await r.json()) as { error: string }).error;

describe("POST /clientes y POST /consultas", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("un cliente sin nombre no se da de alta; con nombre, queda a cuenta corriente y sin deuda", async () => {
    for (const cuerpo of [{}, { nombre: "  " }, { nombre: 3 }]) {
      const r = await pedir(app, "POST", "/clientes", { cuerpo });
      expect(r.status).toBe(400);
      expect(await error(r)).toBe("Hace falta el nombre del cliente");
    }
    const r = await pedir(app, "POST", "/clientes", { cuerpo: { nombre: "  Obra Pérez ", telefono: " 1155 " } });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ nombre: "Obra Pérez", telefono: "1155", cuenta_corriente: true, deuda: "0" });
  });

  it("«no llevó» sin productos no registra nada", async () => {
    for (const cuerpo of [{}, { items: [] }]) {
      const r = await pedir(app, "POST", "/consultas", { cuerpo });
      expect(r.status).toBe(400);
      expect(await error(r)).toBe("No hay nada que registrar");
    }
    expect((await pedir(app, "POST", "/consultas", { cuerpo: { items: [{ descripcion: "Mecha 8" }, { descripcion: "  " }] } })).status).toBe(204);
  });
});
