import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "./rutas.js";
import { crearReglas } from "./reglas.js";
import { migrar } from "./persistencia/migrar.js";
import { baseDePrueba } from "./persistencia/pruebas/base.js";

const TOKEN = "token-servicio";
const base = baseDePrueba();
beforeAll(() => migrar(base));
const app = crearApp({ reglas: crearReglas(base), token: TOKEN, permisoReportes: "negocio.actividad" });

const evento = (cambios: Record<string, unknown> = {}) => ({
  id: randomUUID(), servicio: "comercial", tipo: "venta.registrada", fecha: new Date().toISOString(), titulo: "Venta cobrada", grupo: "Ventas", importancia: "normal", ...cambios,
});
const mandar = (cuerpo: unknown, token = TOKEN) => app.request("/v1/eventos", { method: "POST", headers: { "Content-Type": "application/json", "X-Token-Servicio": token }, body: JSON.stringify(cuerpo) });
const reporte = (consulta = "", permisos = "ventas.registrar,negocio.actividad") => app.request(`/auditoria${consulta}`, { headers: { "X-Token-Servicio": TOKEN, "X-Permisos": permisos } });

// Auditoría (specs/027): recibe el contrato v1 de cualquier servicio y arma los reportes.
describe("la entrada de eventos", () => {
  it("027-E12: un servicio que Auditoría no conoce manda eventos y quedan, con su texto", async () => {
    const r = await mandar({ eventos: [evento({ servicio: "inventado", tipo: "cosa.hecha", titulo: "Cosa hecha", grupo: "Inventado", importancia: "revisar", detalle: "con su detalle" })] });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ guardados: 1 });
    const { eventos } = await (await reporte("?grupo=Inventado")).json() as { eventos: unknown[] };
    expect(eventos).toEqual([expect.objectContaining({ servicio: "inventado", titulo: "Cosa hecha", detalle: "con su detalle", importancia: "revisar" })]);
  });

  it("027-E07: el mismo lote dos veces no guarda nada dos veces", async () => {
    const lote = { eventos: [evento({ grupo: "Repetido" }), evento({ grupo: "Repetido" })] };
    expect(await (await mandar(lote)).json()).toEqual({ guardados: 2 });
    expect(await (await mandar(lote)).json()).toEqual({ guardados: 2 });
    expect((await (await reporte("?grupo=Repetido")).json() as { total: number }).total).toBe(2);
  });

  it("027-E13: un lote que no cumple se rechaza entero, diciendo qué evento y qué campo", async () => {
    const r = await mandar({ eventos: [evento({ grupo: "Rechazado" }), evento({ importancia: "alta" })] });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "Evento 2: el campo «importancia» no cumple el contrato" });
    expect((await (await reporte("?grupo=Rechazado")).json() as { total: number }).total).toBe(0);
    for (const cuerpo of [{}, { eventos: [] }, { eventos: Array.from({ length: 101 }, () => evento()) }, "no es json"]) {
      const mal = await app.request("/v1/eventos", { method: "POST", headers: { "Content-Type": "application/json", "X-Token-Servicio": TOKEN }, body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo) });
      expect(mal.status).toBe(400);
      expect(await mal.json()).toEqual({ error: "Hace falta un lote de 1 a 100 eventos en «eventos»" });
    }
  });

  it("027-E14: sin el token entre servicios, no entra nada", async () => {
    const r = await mandar({ eventos: [evento()] }, "otro");
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: "Auditoría solo atiende a los servicios y a la puerta" });
  });

  it("un lote demasiado grande se rechaza sin leerlo", async () => {
    const r = await app.request("/v1/eventos", { method: "POST", headers: { "Content-Type": "application/json", "X-Token-Servicio": TOKEN }, body: "x".repeat(3 * 1024 * 1024) });
    expect(r.status).toBe(413);
  });
});

describe("los reportes", () => {
  it("027-E01 027-E02: de a 10, lo más nuevo primero, con el total y la página", async () => {
    const ahora = Date.now();
    await mandar({ eventos: Array.from({ length: 12 }, (_, i) => evento({ grupo: "Páginas", fecha: new Date(ahora - i * 1000).toISOString(), detalle: `n${i}` })) });
    const primera = await (await reporte("?grupo=P%C3%A1ginas")).json() as { eventos: { detalle: string }[]; total: number; pagina: number; por_pagina: number };
    expect(primera).toMatchObject({ total: 12, pagina: 1, por_pagina: 10 });
    expect(primera.eventos.map((e) => e.detalle)).toEqual(["n0", "n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9"]);
    const segunda = await (await reporte("?grupo=P%C3%A1ginas&pagina=2")).json() as { eventos: { detalle: string }[]; pagina: number };
    expect(segunda.pagina).toBe(2);
    expect(segunda.eventos.map((e) => e.detalle)).toEqual(["n10", "n11"]);
    expect((await (await reporte("?grupo=P%C3%A1ginas&pagina=cualquiera")).json() as { pagina: number }).pagina).toBe(1);
  });

  it("027-E02: las fechas que no son momentos se rechazan", async () => {
    const r = await reporte("?desde=ayer");
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "Las fechas van como momentos (ISO 8601)" });
  });

  it("los grupos que hay, para el filtro «qué»", async () => {
    await mandar({ eventos: [evento({ grupo: "Grupo del filtro" })] });
    expect((await (await app.request("/auditoria/grupos", { headers: { "X-Token-Servicio": TOKEN, "X-Permisos": "negocio.actividad" } })).json() as { grupos: string[] }).grupos).toContain("Grupo del filtro");
  });

  it("027-E03: sin el permiso, no ve los reportes; sin pasar por la puerta, tampoco", async () => {
    for (const ruta of ["/auditoria", "/auditoria/grupos"]) {
      const sin = await app.request(ruta, { headers: { "X-Token-Servicio": TOKEN, "X-Permisos": "ventas.registrar" } });
      expect(sin.status).toBe(403);
      expect(await sin.json()).toEqual({ error: "No tenés permiso para ver quién hizo qué" });
      expect((await app.request(ruta, { headers: { "X-Permisos": "negocio.actividad" } })).status).toBe(401);
    }
    expect((await app.request("/auditoria", { headers: { "X-Token-Servicio": TOKEN } })).status).toBe(403);
  });

  it("la salud no pide nada", async () => {
    expect(await (await app.request("/health")).json()).toEqual({ ok: true });
  });
});
