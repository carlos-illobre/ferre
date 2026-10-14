import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

// Procesos (ADR-019): Ferrebress exige la sesión y alguno de los dos permisos, y le pasa el
// pedido al servicio con quién lo hace, firmado con el token entre servicios.
describe("/procesos", () => {
  let llamadas: { url: string; init: RequestInit }[];
  let responder: (url: string, init: RequestInit) => Response;
  beforeEach(() => {
    base.actual = baseFalsa();
    llamadas = [];
    responder = () => Response.json([]);
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => { llamadas.push({ url, init }); return responder(url, init); });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sin sesión, 401, y no llega al servicio", async () => {
    expect((await pedir(app, "GET", "/procesos", { rol: null })).status).toBe(401);
    expect(llamadas).toHaveLength(0);
  });

  it("011-E37 sin «Ver procesos» ni «Dibujar procesos», 403 diciendo cuáles hacen falta, y no llega al servicio", async () => {
    const r = await pedir(app, "GET", "/procesos", { rol: "soloVende" });
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toBe("No tenés permiso para esto. Hace falta: Ver procesos o Dibujar procesos");
    expect(llamadas).toHaveLength(0);
  });

  it("011-E38 con solo «Ver procesos» le dice al servicio que puede ver, con el token y quién es", async () => {
    const r = await pedir(app, "GET", "/procesos/abc/versiones?x=1", { rol: "miraProcesos" });
    expect(r.status).toBe(200);
    const { url, init } = llamadas[0]!;
    expect(url).toBe("http://procesos.prueba/procesos/abc/versiones?x=1");
    const h = init.headers as Record<string, string>;
    expect(h).toMatchObject({ "X-Token-Servicio": "token-servicio", "X-Usuario-Id": "u-mira", "X-Usuario-Nombre": "N%C3%BA%C3%B1ez%20Mira", "X-Puede": "ver" });
  });

  it("011-E45 con solo «Dibujar procesos» pasa como dibujar; el servicio sabe que incluye ver", async () => {
    await pedir(app, "GET", "/procesos", { rol: "dibujaProcesos" });
    expect((llamadas[0]!.init.headers as Record<string, string>)["X-Puede"]).toBe("dibujar");
    await pedir(app, "GET", "/procesos", { rol: "dueño" });
    expect((llamadas[1]!.init.headers as Record<string, string>)["X-Puede"]).toBe("ver,dibujar");
  });

  it("011-E39 la respuesta del servicio llega tal cual, también sus errores", async () => {
    responder = () => Response.json({ error: "No tenés permiso para esto. Hace falta: Dibujar procesos" }, { status: 403 });
    const r = await pedir(app, "POST", "/procesos", { rol: "miraProcesos", cuerpo: { nombre: "Venta" } });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "No tenés permiso para esto. Hace falta: Dibujar procesos" });
    expect(base.actual.sqlDe(/insert into "evento"/)).toHaveLength(0);
  });

  it("011-E22 crear, importar, cambiar el borrador, marcar vigente y borrar quedan en «Quién hizo qué», con el nombre del proceso", async () => {
    responder = () => Response.json({ id: "p1", nombre: "Venta en el mostrador" }, { status: 201 });
    await pedir(app, "POST", "/procesos", { rol: "dueño", cuerpo: { nombre: "Venta en el mostrador" } });
    await pedir(app, "POST", "/procesos", { rol: "dueño", cuerpo: { nombre: "Importado", bpmn: "<x/>" } });
    responder = () => Response.json({ id: "p1", nombre: "Venta en el mostrador" });
    await pedir(app, "POST", "/procesos/p1/vigente", { rol: "dueño", cuerpo: { revision: 3 } });
    // El borrador se guarda a cada rato: se anota el primero de cada persona en cada proceso, no cada uno.
    await pedir(app, "PUT", "/procesos/p1/borrador", { rol: "dueño", cuerpo: { revision: 4, bpmn: "<x/>" } });
    await pedir(app, "PUT", "/procesos/p1/borrador", { rol: "dueño", cuerpo: { revision: 5, bpmn: "<y/>" } });
    // El servicio borra sin devolver nada: el nombre se lee antes.
    responder = (_url, init) => init.method === "DELETE" ? new Response(null, { status: 204 }) : Response.json({ id: "p1", nombre: "Venta en el mostrador" });
    const borrado = await pedir(app, "DELETE", "/procesos/p1", { rol: "dueño" });
    expect(borrado.status).toBe(204);
    const eventos = base.actual.sqlDe(/insert into "evento"/).map((c) => [c.params[1], JSON.parse(String(c.params.at(-1)))]);
    expect(eventos).toEqual([
      ["proceso.creado", { id: "p1", nombre: "Venta en el mostrador" }],
      ["proceso.importado", { id: "p1", nombre: "Venta en el mostrador" }],
      ["proceso.vigente", { id: "p1", nombre: "Venta en el mostrador" }],
      ["proceso.borrador_cambiado", { id: "p1", nombre: "Venta en el mostrador" }],
      ["proceso.borrado", { id: "p1", nombre: "Venta en el mostrador" }],
    ]);
    expect(JSON.parse(new TextDecoder().decode(llamadas[0]!.init.body as ArrayBuffer))).toEqual({ nombre: "Venta en el mostrador" });
  });

  it("si el servicio no responde, 502 con un mensaje para la persona", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("ECONNREFUSED"); });
    const r = await pedir(app, "GET", "/procesos", { rol: "dueño" });
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: "Procesos no responde ahora. Probá de nuevo en un rato" });
  });
});
