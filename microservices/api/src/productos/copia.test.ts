import type { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FilaDeLaCopia, LecturaDeLaCopia } from "./datos.js";

// La copia del catálogo en el servidor (specs/018, RF-124): qué lee de la base y cuándo. La base
// se simula con las dos lecturas de `datos.ts`; la conexión que escucha los avisos, con un cliente
// de `pg` de mentira.
const leer = vi.hoisted(() => ({ entero: vi.fn<() => Promise<LecturaDeLaCopia>>(), cambios: vi.fn<(marca: string) => Promise<LecturaDeLaCopia | null>>() }));
vi.mock("./datos.js", async (original) => ({ ...(await original<typeof import("./datos.js")>()), leerCatalogoEntero: leer.entero, leerCambiosDesde: leer.cambios }));

const oyentes = vi.hoisted(() => [] as (EventEmitter & { query: (q: string) => Promise<void> })[]);
vi.mock("pg", async (original) => {
  const pg = await original<typeof import("pg")>();
  const { EventEmitter } = await import("node:events");
  class Client extends EventEmitter {
    constructor() { super(); oyentes.push(this as never); }
    async connect() { /* conectado */ }
    async query(_q: string) { /* LISTEN */ }
    async end() { /* cerrado */ }
  }
  return { ...pg, default: { ...pg.default, Client } };
});

const fila = (id: string, descripcion: string, extra: Partial<FilaDeLaCopia> = {}) =>
  ({ id, descripcion, marca: null, codigo_barras: null, codigos: [], vigente: true, ...extra }) as FilaDeLaCopia;
const lectura = (marca: string, filas: FilaDeLaCopia[], quitados: string[] = []): LecturaDeLaCopia => ({ marca, filas, quitados });
const descripciones = (copia: typeof import("./copia.js")) => copia.buscar({}).map((f) => f.descripcion);
const ARCHIVO = path.join(process.env.CARPETA_LISTAS!, "copia", "catalogo.json");

async function copiaNueva() {
  vi.resetModules();
  return import("./copia.js");
}

describe("la copia del catálogo", () => {
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    leer.entero.mockReset(); leer.cambios.mockReset(); oyentes.length = 0;
    await rm(ARCHIVO, { force: true });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("018-E18: la primera vez lee la base entera; al guardarla, el próximo arranque parte del disco y lee solo lo que cambió", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("b", "Tuerca"), fila("a", "Arandela")]));
    leer.cambios.mockResolvedValue(lectura("100", []));
    const copia = await copiaNueva();
    await copia.iniciar();
    expect(leer.entero).toHaveBeenCalledTimes(1);
    expect(descripciones(copia)).toEqual(["Arandela", "Tuerca"]);
    await vi.advanceTimersByTimeAsync(2500); // se guarda en el disco: se espera a que termine de escribir
    for (let i = 0; i < 1000 && !existsSync(ARCHIVO); i++) await new Promise((r) => setImmediate(r));

    leer.cambios.mockResolvedValue(lectura("140", [fila("c", "Clavo")]));
    const otra = await copiaNueva();
    await otra.iniciar();
    expect(leer.entero).toHaveBeenCalledTimes(1);
    expect(leer.cambios).toHaveBeenLastCalledWith("100");
    expect(descripciones(otra)).toEqual(["Arandela", "Clavo", "Tuerca"]);
  });

  it("018-E15 018-E16: al aviso de la base lee solo lo que cambió desde su marca, y la próxima búsqueda lo ve", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela", { margen_elegido: 50 }), fila("b", "Tuerca")]));
    leer.cambios.mockResolvedValue(lectura("100", []));
    const copia = await copiaNueva();
    await copia.iniciar();
    await vi.advanceTimersByTimeAsync(300);
    leer.cambios.mockClear();
    leer.cambios.mockResolvedValue(lectura("120", [fila("a", "Arandela", { margen_elegido: 100 })]));
    oyentes.at(-1)!.emit("notification", { channel: "catalogo" });
    oyentes.at(-1)!.emit("notification", { channel: "catalogo" }); // varios avisos juntos, una lectura
    await vi.advanceTimersByTimeAsync(300);
    expect(leer.cambios).toHaveBeenCalledTimes(1);
    expect(leer.cambios).toHaveBeenCalledWith("100");
    expect(copia.buscar({ ids: ["a"] })[0]!.margen_elegido).toBe(100);
  });

  it("018-E04 018-E16: un producto unido a otro o dado de baja sale de las búsquedas; uno que ya no existe, también", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela"), fila("b", "Tuerca"), fila("c", "Clavo")]));
    leer.cambios.mockResolvedValueOnce(lectura("130", [fila("b", "Tuerca", { vigente: false })], ["c"]));
    const copia = await copiaNueva();
    await copia.iniciar();
    await copia.ponerAlDia();
    expect(descripciones(copia)).toEqual(["Arandela"]);
  });

  it("una marca que la base todavía no alcanzó (otra base, una restaurada) no sirve: lee todo de nuevo", async () => {
    leer.entero.mockResolvedValueOnce(lectura("100", [fila("a", "Arandela")])).mockResolvedValueOnce(lectura("5", [fila("z", "Zapapico")]));
    leer.cambios.mockResolvedValueOnce(null);
    const copia = await copiaNueva();
    await copia.iniciar();
    await copia.ponerAlDia();
    expect(leer.entero).toHaveBeenCalledTimes(2);
    expect(descripciones(copia)).toEqual(["Zapapico"]);
  });

  it("018-E17: si la lectura falla, la copia queda como estaba", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela")]));
    leer.cambios.mockRejectedValueOnce(new Error("la base no responde"));
    const copia = await copiaNueva();
    await copia.iniciar();
    await expect(copia.ponerAlDia()).rejects.toThrow("la base no responde");
    expect(descripciones(copia)).toEqual(["Arandela"]);
  });

  it("018-E19: si la conexión que escucha se corta, se reconecta y lee lo que cambió mientras tanto", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela")]));
    leer.cambios.mockResolvedValue(lectura("100", []));
    const copia = await copiaNueva();
    await copia.iniciar();
    await vi.advanceTimersByTimeAsync(300);
    leer.cambios.mockClear();
    leer.cambios.mockResolvedValue(lectura("150", [fila("b", "Bulón")]));
    oyentes.at(-1)!.emit("error", new Error("se cortó"));
    await vi.advanceTimersByTimeAsync(1500);
    expect(oyentes).toHaveLength(2);
    expect(leer.cambios).toHaveBeenCalledWith("100");
    expect(descripciones(copia)).toEqual(["Arandela", "Bulón"]);
  });
});
