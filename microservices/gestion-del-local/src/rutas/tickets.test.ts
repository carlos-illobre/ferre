import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const escritos = vi.hoisted(() => [] as string[]);
vi.mock("node:fs/promises", async (original) => ({
  ...(await original<typeof import("node:fs/promises")>()),
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async (ruta: string) => { escritos.push(String(ruta)); }),
  readFile: vi.fn(async (ruta: string) => { if (String(ruta).includes("no-esta")) throw new Error("no existe"); return Buffer.from("imagen"); }),
}));
const { app } = await import("../app.js");

const ID = "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11";
function formulario(cambios: Record<string, string> = {}, fotos = 0, tipoDeFoto = "image/png") {
  const f = new FormData();
  for (const [k, v] of Object.entries({ id: ID, tipo: "error", descripcion: "Al cobrar con tarjeta queda la pantalla en blanco", dispositivo: "celular · Chrome", version: "pruebas abc", ...cambios })) f.append(k, v);
  for (let i = 0; i < fotos; i++) f.append("fotos", new File(["x"], `captura-${i}.png`, { type: tipoDeFoto }));
  return f;
}

describe("tickets", () => {
  beforeEach(() => { base.actual = baseFalsa(); escritos.length = 0; base.actual.programar(/INSERT INTO ticket \(/, { rowCount: 1 }); });

  it("sin sesión, 401", async () => {
    expect((await pedir(app, "GET", "/tickets", { rol: null })).status).toBe(401);
    expect((await pedir(app, "POST", "/tickets", { rol: null, formulario: formulario() })).status).toBe(401);
    expect((await pedir(app, "GET", "/tickets/fotos/0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11.png", { rol: null })).status).toBe(401);
  });

  it("se crea con texto y fotos, cada foto con nombre al azar, y queda auditado", async () => {
    const r = await pedir(app, "POST", "/tickets", { rol: "mostrador", formulario: formulario({}, 2) });
    expect(r.status).toBe(201);
    const alta = base.actual.sqlDe(/INSERT INTO ticket \(/)[0]!;
    expect(alta.params.slice(0, 3)).toEqual([ID, "error", "Al cobrar con tarjeta queda la pantalla en blanco"]);
    expect(alta.params[5]).toBe("u-mostrador");
    expect(base.actual.sqlDe(/INSERT INTO ticket_foto/)).toHaveLength(2);
    expect(escritos).toHaveLength(2);
    expect(escritos[0]).toMatch(/tickets\/[0-9a-f-]{36}\.png$/);
    expect(base.actual.sqlDe(/INSERT INTO evento/).at(-1)!.params[1]).toBe("ticket.creado");
  });

  it("un reenvío del mismo ticket no lo duplica ni vuelve a guardar las fotos", async () => {
    base.actual.programar(/INSERT INTO ticket \(/, { rowCount: 0 });
    const r = await pedir(app, "POST", "/tickets", { formulario: formulario({}, 1) });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ repetido: true });
    expect(escritos).toHaveLength(0);
  });

  it("rechaza lo que no sirve, diciendo por qué", async () => {
    const error = async (f: FormData) => { const r = await pedir(app, "POST", "/tickets", { formulario: f }); return [r.status, ((await r.json()) as { error: string }).error] as const; };
    expect((await error(formulario({ tipo: "queja" })))[0]).toBe(400);
    expect((await error(formulario({ descripcion: " " })))[1]).toContain("Contá qué pasó");
    expect((await error(formulario({ id: "no-es-un-id" })))[0]).toBe(400);
    expect((await error(formulario({}, 6)))[1]).toContain("hasta 5 fotos");
    expect((await error(formulario({}, 1, "application/pdf")))[1]).toContain("jpeg, png o webp");
    expect(base.actual.sqlDe(/INSERT INTO ticket \(/)).toHaveLength(0);
  });

  it("se marca resuelto con su nota y se puede reabrir; lo que no corresponde, 409", async () => {
    base.actual.programar(/UPDATE ticket SET estado = 'resuelto'/, { rowCount: 1 });
    expect((await pedir(app, "POST", `/tickets/${ID}/resolver`, { rol: "admin", cuerpo: { nota: "Corregido en la versión de hoy" } })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE ticket SET estado = 'resuelto'/)[0]!.params).toEqual([ID, "u-admin", "Corregido en la versión de hoy"]);
    base.actual.programar(/UPDATE ticket SET estado = 'abierto'/, { rowCount: 1 });
    expect((await pedir(app, "POST", `/tickets/${ID}/reabrir`)).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE ticket SET estado = 'abierto'/)[0]!.sql).toContain("nota = NULL"); // la nota se va con la resolución
    base.actual.limpiar();
    expect((await pedir(app, "POST", `/tickets/${ID}/resolver`, { cuerpo: {} })).status).toBe(409);
    expect((await pedir(app, "POST", `/tickets/${ID}/reabrir`)).status).toBe(409);
  });

  it("las fotos se entregan solo con sesión y con un nombre válido", async () => {
    const buena = await pedir(app, "GET", "/tickets/fotos/0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11.png");
    expect(buena.status).toBe(200);
    expect(buena.headers.get("Cache-Control")).toContain("private");
    expect((await pedir(app, "GET", "/tickets/fotos/..%2Fsecreto.png")).status).toBe(404);
  });
});
