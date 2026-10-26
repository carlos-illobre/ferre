import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "kysely";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { crearApp } from "./rutas.js";
import { crearReglas } from "./reglas.js";
import { crearBandeja } from "./persistencia/auditoria.js";
import { migrar } from "./persistencia/migrar.js";
import { baseDePrueba } from "./persistencia/pruebas/base.js";
import { datosDeTickets } from "./persistencia/tickets.js";

const TOKEN = "token-servicio";
const base = baseDePrueba();
const bandeja = crearBandeja(base, { conexion: process.env.BASE_DE_TICKETS!, auditoria: "http://auditoria.prueba", token: TOKEN });
let app: ReturnType<typeof crearApp>;
beforeAll(async () => {
  await migrar(base);
  await sql`CREATE TABLE IF NOT EXISTS auditoria_bandeja (id uuid PRIMARY KEY, evento jsonb NOT NULL, anotado_en timestamptz NOT NULL DEFAULT now(), entregado_en timestamptz, rechazo text)`.execute(base);
  app = crearApp({ reglas: crearReglas(datosDeTickets(base, await mkdtemp(path.join(tmpdir(), "tickets-")), bandeja.anotar)), token: TOKEN });
});

const persona = { "X-Token-Servicio": TOKEN, "X-Usuario-Id": "u-ana", "X-Usuario-Nombre": encodeURIComponent("Ana Núñez") };
const pedir = (ruta: string, init: RequestInit = {}, cabeceras: Record<string, string> = persona) => app.request(ruta, { ...init, headers: { ...cabeceras, ...(init.headers as Record<string, string>) } });
function formulario(campos: Record<string, string>, fotos: File[] = []) {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  for (const foto of fotos) f.append("fotos", foto);
  return f;
}
const png = (bytes = 10) => new File([new Uint8Array(bytes)], "captura.png", { type: "image/png" });
const eventos = () => sql<{ evento: Record<string, unknown> }>`SELECT evento FROM auditoria_bandeja ORDER BY anotado_en`.execute(base).then((r) => r.rows.map((f) => f.evento));

// Tickets (specs/028): las mismas rutas y respuestas que tenía Comercial.
describe("los tickets por sus rutas", () => {
  it("028-E01 028-E02 028-E04 028-E05: cargar con foto, verlo con quién lo cargó, pedir la foto; un reenvío no se guarda dos veces; el evento va con sus palabras", async () => {
    const id = crypto.randomUUID();
    const campos = { id, tipo: "mejora", descripcion: "Que se pueda imprimir", dispositivo: "Celular", version: "abc" };
    expect((await pedir("/tickets", { method: "POST", body: formulario(campos, [png()]) })).status).toBe(201);
    const otra = await pedir("/tickets", { method: "POST", body: formulario(campos, [png()]) });
    expect(await otra.json()).toEqual({ id, repetido: true });
    const lista = (await (await pedir("/tickets")).json()) as { id: string; usuario: string; fotos: string[]; creado_en: string }[];
    const t = lista.find((x) => x.id === id)!;
    expect(t).toMatchObject({ usuario: "Ana Núñez", estado: "abierto" });
    expect(Date.parse(t.creado_en)).not.toBeNaN();
    const foto = await pedir(t.fotos[0]!);
    expect(foto.status).toBe(200);
    expect(foto.headers.get("Content-Type")).toBe("image/png");
    // Una ruta a otra carpeta, codificada para que llegue tal cual: el nombre no pasa la validación.
    expect((await pedir("/tickets/fotos/..%2F..%2Fetc%2Fpasswd")).status).toBe(404);
    expect((await pedir(`/tickets/fotos/${crypto.randomUUID()}.webp`)).status).toBe(404);
    expect((await eventos()).at(-1)).toMatchObject({ tipo: "ticket.creado", titulo: "Pedido de mejora o error", detalle: "Mejora · 1 foto", grupo: "Mejoras y errores", quien: { id: "u-ana", nombre: "Ana Núñez" }, referencias: [{ cosa: "ticket", id }] });
  });

  it("028-E01: las mismas validaciones y mensajes de antes", async () => {
    const ok = { id: crypto.randomUUID(), tipo: "error", descripcion: "No anda" };
    const casos: [Record<string, string>, File[], number, string][] = [
      [{ ...ok, id: "x" }, [], 400, "Falta el identificador del ticket"],
      [{ ...ok, tipo: "otro" }, [], 400, "Decí si es un error o una mejora"],
      [{ ...ok, descripcion: "no" }, [], 400, "Contá qué pasó o qué te gustaría, aunque sea en una línea"],
      [{ ...ok, descripcion: "x".repeat(5001) }, [], 400, "El texto es demasiado largo: resumilo en menos de 5.000 letras"],
      [ok, Array.from({ length: 6 }, () => png()), 400, "Son hasta 5 fotos por ticket"],
      [ok, [new File(["x"], "a.gif", { type: "image/gif" })], 400, "Las fotos tienen que ser jpeg, png o webp"],
      [ok, [png(10 * 1024 * 1024 + 1)], 413, "Una foto pesa más de 10 MB"],
    ];
    for (const [campos, fotos, estado, error] of casos) {
      const r = await pedir("/tickets", { method: "POST", body: formulario(campos, fotos) });
      expect([r.status, await r.json()], error).toEqual([estado, { error }]);
    }
    const r = await pedir("/tickets", { method: "POST", body: formulario({ ...ok, tipo: "error" }, [new File(["x"], "a.jpg", { type: "image/jpeg" }), new File(["x"], "b.webp", { type: "image/webp" })]) });
    expect(r.status).toBe(201);
    const fotos = ((await (await pedir("/tickets")).json()) as { id: string; fotos: string[] }[]).find((t) => t.id === ok.id)!.fotos;
    expect(await Promise.all(fotos.map(async (f) => (await pedir(f)).headers.get("Content-Type")))).toEqual(["image/jpeg", "image/webp"]);
    expect((await eventos()).at(-1)).toMatchObject({ detalle: "Error · 2 fotos" });
  });

  it("028-E03: resolver con nota y reabrir, como antes", async () => {
    const id = crypto.randomUUID();
    await pedir("/tickets", { method: "POST", body: formulario({ id, tipo: "error", descripcion: "Se cuelga" }) });
    const json = { "Content-Type": "application/json" };
    expect((await pedir(`/tickets/${id}/resolver`, { method: "POST", headers: json, body: JSON.stringify({ nota: 5 }) })).status).toBe(400);
    expect((await pedir(`/tickets/${id}/resolver`, { method: "POST", headers: json, body: JSON.stringify({ nota: "  Listo  " }) })).status).toBe(204);
    expect((await pedir(`/tickets/${id}/resolver`, { method: "POST", headers: json, body: JSON.stringify({}) })).status).toBe(409);
    expect((await eventos()).at(-1)).toMatchObject({ tipo: "ticket.resuelto", detalle: "Listo" });
    expect(((await (await pedir("/tickets")).json()) as { id: string; resuelto_por: string; nota: string; resuelto_en: string }[]).find((t) => t.id === id)).toMatchObject({ resuelto_por: "Ana Núñez", nota: "Listo" });
    expect((await pedir(`/tickets/${id}/reabrir`, { method: "POST" })).status).toBe(204);
    expect((await pedir(`/tickets/${id}/reabrir`, { method: "POST" })).status).toBe(409);
    expect((await pedir("/tickets/no-es-uuid/reabrir", { method: "POST" })).status).toBe(409);
    expect((await pedir("/tickets/no-es-uuid/resolver", { method: "POST", headers: json, body: "{}" })).status).toBe(409);
    expect((await eventos()).at(-1)).toMatchObject({ tipo: "ticket.reabierto", detalle: null });
  });

  it("resolver con un cuerpo que no es JSON resuelve sin nota, como antes; un error inesperado se dice con palabras", async () => {
    const id = crypto.randomUUID();
    await pedir("/tickets", { method: "POST", body: formulario({ id, tipo: "error", descripcion: "Se cuelga" }) });
    expect((await pedir(`/tickets/${id}/resolver`, { method: "POST", body: "no es json" })).status).toBe(204);
    expect((await (await pedir("/tickets")).json() as { id: string; nota: string | null }[]).find((t) => t.id === id)!.nota).toBeNull();
    const roto = crearApp({ reglas: { ultimos: () => { throw new Error("se rompió"); } } as never, token: TOKEN });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const r = await roto.request("/tickets", { headers: persona });
    expect([r.status, await r.json()]).toEqual([500, { error: "Algo falló en el servidor. Probá de nuevo; si sigue, avisale al dueño." }]);
  });

  it("028-E07: sin el token o sin quién es la persona, no atiende; la salud sí", async () => {
    expect((await pedir("/tickets", {}, {})).status).toBe(401);
    expect((await pedir("/tickets", {}, { "X-Token-Servicio": "ñ".repeat(TOKEN.length), "X-Usuario-Id": "u" })).status).toBe(401);
    const sinPersona = await pedir("/tickets", {}, { "X-Token-Servicio": TOKEN });
    expect([sinPersona.status, await sinPersona.json()]).toEqual([401, { error: "Hay que iniciar sesión" }]);
    expect((await pedir("/tickets", {}, { "X-Token-Servicio": TOKEN, "X-Usuario-Id": "u", "X-Usuario-Nombre": "%E0%A4%A" })).status).toBe(401);
    expect((await pedir("/tickets", {}, { "X-Token-Servicio": TOKEN, "X-Usuario-Id": "u-sin-nombre" })).status).toBe(200);
    expect((await app.request("/health")).status).toBe(200);
  });
});
