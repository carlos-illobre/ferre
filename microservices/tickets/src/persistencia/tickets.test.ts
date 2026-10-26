import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearBandeja } from "./auditoria.js";
import { migrar } from "./migrar.js";
import { baseDePrueba } from "./pruebas/base.js";
import { datosDeTickets } from "./tickets.js";

const base = baseDePrueba();
const bandeja = crearBandeja(base, { conexion: process.env.BASE_DE_TICKETS!, auditoria: "http://auditoria.prueba", token: "t" });
let carpeta = "";
const ana = { id: "u-ana", nombre: "Ana" };
const beto = { id: "u-beto", nombre: "Beto" };
const evento = (tipo: string) => ({ tipo, titulo: "T", grupo: "Mejoras y errores", importancia: "normal" as const });
const anotados = () => sql<{ tipo: string }>`SELECT evento->>'tipo' AS tipo FROM auditoria_bandeja ORDER BY anotado_en`.execute(base).then((r) => r.rows.map((f) => f.tipo));
const nuevo = (id: string) => ({ id, tipo: "error" as const, descripcion: "No anda", dispositivo: "Celular", version: "v1", fotos: [{ contenido: Buffer.from("foto"), extension: ".png" }] });

// Los tickets en la base de Tickets y sus fotos en su carpeta (specs/028).
describe("los tickets en Postgres", () => {
  beforeAll(async () => { await migrar(base); await bandeja.iniciar(); carpeta = path.join(await mkdtemp(path.join(tmpdir(), "tickets-")), "fotos"); });
  afterAll(() => bandeja.parar());

  it("028-E01 028-E02 028-E04: se guarda con sus fotos y el nombre de quien lo cargó, una sola vez; la foto se lee de la carpeta", async () => {
    const datos = datosDeTickets(base, carpeta, bandeja.anotar);
    const id = crypto.randomUUID();
    expect(await datos.crear(nuevo(id), ana, evento("ticket.creado"))).toBe(true);
    expect(await datos.crear(nuevo(id), ana, evento("ticket.creado"))).toBe(false);
    const [t] = await datos.ultimos();
    expect(t).toMatchObject({ id, tipo: "error", descripcion: "No anda", dispositivo: "Celular", version: "v1", estado: "abierto", usuario: "Ana", resuelto_por: null, nota: null });
    expect(t!.fotos).toHaveLength(1);
    const [archivo] = await readdir(carpeta);
    expect(t!.fotos[0]).toBe(`/tickets/fotos/${archivo}`);
    expect((await datos.leerFoto(archivo!))!.toString()).toBe("foto");
    expect(await datos.leerFoto("no-existe.png")).toBeNull();
  });

  it("028-E03 028-E05: resolver con nota y reabrir cambian como antes y anotan su evento; lo que no cambia no anota", async () => {
    const datos = datosDeTickets(base, carpeta, bandeja.anotar);
    const id = crypto.randomUUID();
    await datos.crear({ ...nuevo(id), fotos: [] }, ana, evento("ticket.creado"));
    expect(await datos.resolver(id, beto, "Arreglado", evento("ticket.resuelto"))).toBe(true);
    expect(await datos.resolver(id, beto, "Otra vez", evento("ticket.resuelto"))).toBe(false);
    expect((await datos.ultimos()).find((t) => t.id === id)).toMatchObject({ estado: "resuelto", resuelto_por: "Beto", nota: "Arreglado", fotos: [] });
    expect(await datos.reabrir(id, evento("ticket.reabierto"))).toBe(true);
    expect(await datos.reabrir(id, evento("ticket.reabierto"))).toBe(false);
    expect((await datos.ultimos()).find((t) => t.id === id)).toMatchObject({ estado: "abierto", resuelto_por: null, nota: null, resuelto_en: null });
    expect((await anotados()).slice(-3)).toEqual(["ticket.creado", "ticket.resuelto", "ticket.reabierto"]);
  });
});
