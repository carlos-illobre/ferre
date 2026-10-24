import type { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FilaDeLaCopia, LecturaDeLaCopia } from "../persistencia/productos.js";

// La copia del catálogo en el servidor (specs/018, RF-124): qué lee de la base y cuándo. La base
// se simula con las dos lecturas de `datos.ts`; la conexión que escucha los avisos, con un cliente
// de `pg` de mentira.
const leer = vi.hoisted(() => ({ entero: vi.fn<() => Promise<LecturaDeLaCopia>>(), cambios: vi.fn<(marca: string) => Promise<LecturaDeLaCopia | null>>() }));
vi.mock("../persistencia/productos.js", async (original) => ({ ...(await original<typeof import("../persistencia/productos.js")>()), leerCatalogoEntero: leer.entero, leerCambiosDesde: leer.cambios }));

const oyentes = vi.hoisted(() => [] as (EventEmitter & { query: (q: string) => Promise<void>; end: () => Promise<void> })[]);
const conexion = vi.hoisted(() => ({ falla: false }));
vi.mock("pg", async (original) => {
  const pg = await original<typeof import("pg")>();
  const { EventEmitter } = await import("node:events");
  class Client extends EventEmitter {
    constructor() { super(); oyentes.push(this as never); }
    async connect() { if (conexion.falla) throw new Error("no conecta"); }
    async query(_q: string) { /* LISTEN */ }
    async end() { /* cerrado */ }
  }
  return { ...pg, default: { ...pg.default, Client } };
});

const fila = (id: string, descripcion: string, extra: Partial<FilaDeLaCopia> = {}) =>
  ({ id, descripcion, marca: null, codigo_barras: null, codigos: [], vigente: true, ...extra }) as FilaDeLaCopia;
const lectura = (marca: string, filas: FilaDeLaCopia[], quitados: string[] = []): LecturaDeLaCopia => ({ marca, filas, quitados });
const descripciones = (copia: typeof import("./copia.js")) => copia.buscar({}).map((f) => f.descripcion);
// Cada prueba guarda en su propia carpeta: una escritura tardía de la anterior no pisa la suya.
const CARPETA_DE_LAS_PRUEBAS = process.env.CARPETA_LISTAS!;
let ARCHIVO = "";

// La copia se escribe en el disco aparte: se espera a que esté, hasta 5 segundos (con la máquina
// cargada, unas vueltas del bucle de eventos no alcanzan).
async function hastaQueEsteEnElDisco() {
  const hasta = Date.now() + 5000;
  while (!existsSync(ARCHIVO) && Date.now() < hasta) await new Promise((r) => setImmediate(r));
}

async function copiaNueva() {
  vi.resetModules();
  return import("./copia.js");
}

describe("la copia del catálogo", () => {
  beforeEach(async () => {
    await mkdir(CARPETA_DE_LAS_PRUEBAS, { recursive: true });
    process.env.CARPETA_LISTAS = await mkdtemp(path.join(CARPETA_DE_LAS_PRUEBAS, "copia-"));
    ARCHIVO = path.join(process.env.CARPETA_LISTAS, "copia", "catalogo.json");
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    leer.entero.mockReset(); leer.cambios.mockReset(); oyentes.length = 0; conexion.falla = false;
    await rm(ARCHIVO, { force: true });
  });
  afterEach(() => { vi.useRealTimers(); process.env.CARPETA_LISTAS = CARPETA_DE_LAS_PRUEBAS; });

  it("018-E18: la primera vez lee la base entera; al guardarla, el próximo arranque parte del disco y lee solo lo que cambió", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("b", "Tuerca"), fila("a", "Arandela")]));
    leer.cambios.mockResolvedValue(lectura("100", []));
    const copia = await copiaNueva();
    await copia.iniciar();
    expect(leer.entero).toHaveBeenCalledTimes(1);
    expect(descripciones(copia)).toEqual(["Arandela", "Tuerca"]);
    await vi.advanceTimersByTimeAsync(2500); // se guarda en el disco: se espera a que termine de escribir
    await hastaQueEsteEnElDisco();

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

  it("una copia guardada de otra base no se usa: se lee la base entera", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela")]));
    leer.cambios.mockResolvedValue(lectura("100", []));
    const copia = await copiaNueva();
    await copia.iniciar();
    await vi.advanceTimersByTimeAsync(2500);
    await hastaQueEsteEnElDisco();
    const { readFile, writeFile } = await import("node:fs/promises");
    const guardada = JSON.parse(await readFile(ARCHIVO, "utf8"));
    await writeFile(ARCHIVO, JSON.stringify({ ...guardada, base: "otro-servidor:5432/postgres" }));
    leer.entero.mockClear();
    const otra = await copiaNueva();
    await otra.iniciar();
    expect(leer.entero).toHaveBeenCalledTimes(1);
  });

  it("un producto que la base borró de verdad se manda como quitado en la descarga siguiente", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela", { cambio: "90" }), fila("b", "Tuerca", { cambio: "90" })]));
    leer.cambios.mockResolvedValueOnce(lectura("130", [], ["b"]));
    const copia = await copiaNueva();
    await copia.iniciar();
    await copia.ponerAlDia();
    expect(copia.descarga({ marca: "120", desde: "", limite: 500 }).quitados).toEqual(["b"]);
    expect(copia.descarga({ marca: "140", desde: "", limite: 500 }).quitados).toEqual([]);
  });

  it("018-E19: un error que llega tarde del cliente que ya se soltó no tumba el proceso; si no conecta, lo suelta y reintenta", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela")]));
    leer.cambios.mockResolvedValue(lectura("100", []));
    const copia = await copiaNueva();
    await copia.iniciar();
    const primero = oyentes.at(-1)!;
    conexion.falla = true;
    primero.emit("error", new Error("se cortó"));
    expect(() => primero.emit("error", new Error("otro error, tarde"))).not.toThrow();
    await vi.advanceTimersByTimeAsync(1500); // reintenta y no conecta
    const segundo = oyentes.at(-1)!;
    expect(segundo).not.toBe(primero);
    expect(() => segundo.emit("error", new Error("tarde"))).not.toThrow();
    conexion.falla = false;
    await vi.advanceTimersByTimeAsync(2500); // espera creciente: 2 s
    expect(oyentes.length).toBeGreaterThanOrEqual(3);
  });

  it("018-E19: si leer lo que cambió falla, se vuelve a intentar a los 30 segundos", async () => {
    leer.entero.mockResolvedValue(lectura("100", [fila("a", "Arandela")]));
    leer.cambios.mockRejectedValueOnce(new Error("la base no responde")).mockResolvedValue(lectura("120", [fila("b", "Bulón")]));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const copia = await copiaNueva();
    await copia.iniciar();
    await vi.advanceTimersByTimeAsync(300); // el aviso al conectar: falla
    expect(descripciones(copia)).toEqual(["Arandela"]);
    await vi.advanceTimersByTimeAsync(30_500);
    expect(descripciones(copia)).toEqual(["Arandela", "Bulón"]);
    error.mockRestore();
  });
});
