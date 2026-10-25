import { describe, expect, it } from "vitest";
import { crearApp } from "./rutas.js";
import { crearReglas } from "./reglas.js";
import { almacenEnMemoria } from "./memoria.js";

const TOKEN = "token-de-prueba";
// Otros nombres que los de Ferrebress: Procesos usa los que le dice su configuración.
const PERMISOS = { ver: "mirar-diagramas", dibujar: "editar-diagramas" };
const app = () => crearApp({ reglas: crearReglas(almacenEnMemoria()), token: TOKEN, permisos: PERMISOS });
// «ver», «dibujar» o los dos, con los nombres de la aplicación que lo usa.
const permisos = (puede: string) => puede.split(",").filter(Boolean).map((p) => PERMISOS[p.trim() as keyof typeof PERMISOS] ?? p).join(",");

function cabeceras(puede: string, extra: Record<string, string> = {}) {
  return { "X-Token-Servicio": TOKEN, "X-Usuario-Id": "u1", "X-Usuario-Nombre": encodeURIComponent("José Núñez"), "X-Permisos": permisos(puede), "Content-Type": "application/json", ...extra };
}

describe("quién llama", () => {
  it("sin el token entre servicios, o con otro, no atiende", async () => {
    const a = app();
    expect((await a.request("/procesos")).status).toBe(401);
    expect((await a.request("/procesos", { headers: { ...cabeceras("dibujar"), "X-Token-Servicio": "otro" } })).status).toBe(401);
    expect((await a.request("/procesos", { headers: { "X-Token-Servicio": TOKEN, "X-Permisos": "editar-diagramas" } })).status).toBe(401);
  });

  it("011-E37 011-E39 sin ver ni dibujar no se puede ni leer la lista", async () => {
    const r = await app().request("/procesos", { headers: cabeceras("") });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "No tenés permiso para esto. Hace falta: Ver procesos o Dibujar procesos" });
  });

  it("011-E45 dibujar sin ver alcanza para todo: dibujar incluye ver", async () => {
    const a = app();
    const creado = await a.request("/procesos", { method: "POST", headers: cabeceras("dibujar"), body: JSON.stringify({ nombre: "Venta" }) });
    expect(creado.status).toBe(201);
    const p = (await creado.json()) as { id: string; borrador: { hechaPor: string } };
    expect(p.borrador.hechaPor).toBe("José Núñez");
    expect((await a.request(`/procesos/${p.id}`, { headers: cabeceras("dibujar") })).status).toBe(200);
  });

  it("011-E39 con solo ver, cambiar da 403 y dice qué permiso falta", async () => {
    const r = await app().request("/procesos", { method: "POST", headers: cabeceras("ver"), body: JSON.stringify({ nombre: "Venta" }) });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: "No tenés permiso para esto. Hace falta: Dibujar procesos" });
  });
});

describe("las rutas traducen", () => {
  it("011-E41 un borrador guardado sobre una revisión vieja da 409 con el proceso como quedó", async () => {
    const a = app();
    const p = (await (await a.request("/procesos", { method: "POST", headers: cabeceras("ver,dibujar"), body: JSON.stringify({ nombre: "Venta" }) })).json()) as { id: string; revision: number; borrador: { bpmn: string } };
    const guardar = () => a.request(`/procesos/${p.id}/borrador`, { method: "PUT", headers: cabeceras("dibujar"), body: JSON.stringify({ bpmn: p.borrador.bpmn, revision: p.revision }) });
    expect((await guardar()).status).toBe(200);
    const choque = await guardar();
    expect(choque.status).toBe(409);
    expect(((await choque.json()) as { proceso: { revision: number } }).proceso.revision).toBe(p.revision + 1);
  });

  it("011-E20 011-E24 011-E22 borrar da 204; descartar y marcar vigente responden el proceso", async () => {
    const a = app();
    const p = (await (await a.request("/procesos", { method: "POST", headers: cabeceras("dibujar"), body: JSON.stringify({ nombre: "Venta" }) })).json()) as { id: string; revision: number };
    const vigente = await a.request(`/procesos/${p.id}/vigente`, { method: "POST", headers: cabeceras("dibujar"), body: JSON.stringify({ revision: p.revision }) });
    expect(vigente.status).toBe(200);
    const { revision } = (await vigente.json()) as { revision: number };
    expect((await a.request(`/procesos/${p.id}/borrador?revision=${revision}`, { method: "DELETE", headers: cabeceras("dibujar") })).status).toBe(409);
    expect((await a.request(`/procesos/${p.id}/versiones`, { headers: cabeceras("ver") })).status).toBe(200);
    expect((await a.request(`/procesos/${p.id}`, { method: "DELETE", headers: cabeceras("dibujar") })).status).toBe(204);
    expect((await a.request(`/procesos/${p.id}`, { headers: cabeceras("dibujar") })).status).toBe(404);
  });

  it("011-E36 un pedido de más de 5 MB se corta antes de leerlo", async () => {
    const r = await app().request("/procesos", { method: "POST", headers: cabeceras("dibujar"), body: JSON.stringify({ nombre: "x", bpmn: "a".repeat(6 * 1024 * 1024) }) });
    expect(r.status).toBe(413);
    expect(await r.json()).toEqual({ error: "Pesa más de 5 MB" });
  });

  it("un cuerpo que no es JSON se toma como vacío y la regla dice qué falta", async () => {
    const r = await app().request("/procesos", { method: "POST", headers: cabeceras("dibujar"), body: "no es json" });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "Escribí un nombre para el proceso" });
  });

  it("/health responde sin token, para el control del contenedor", async () => {
    expect((await app().request("/health")).status).toBe(200);
  });
});
