import { describe, expect, it } from "vitest";
import { crearCanales, rechazar, MAXIMO_POR_MENSAJE, MAXIMO_POR_TANDA } from "./index.js";
import { lectorDeFlujo } from "../pruebas/flujos.js";
import { relojDePrueba } from "../pruebas/reloj.js";

const A = 'data: {"a":{}}';

describe("canales", () => {
  it("al abrir cuenta lo que va a cuestas y el estado de cada tema (025-E06, 025-E11)", async () => {
    const canales = crearCanales({ cadaTanto: relojDePrueba().cadaTanto, aCuestas: () => ({ version: "v1" }) });
    const r = canales.abrir("d1", "g", [{ tema: "entrada:1", inicial: { listo: true } }, { tema: "otro" }]);
    expect(r.headers.get("Content-Type")).toBe("text/event-stream");
    expect(await lectorDeFlujo(r).leer()).toEqual(['data: {"a":{"version":"v1"}}', 'data: {"t":"entrada:1","d":{"listo":true}}']);
  });

  it("avisa un tema solo a quien lo escucha; si nadie, no pasa nada (025-E27)", async () => {
    const canales = crearCanales({ cadaTanto: relojDePrueba().cadaTanto });
    const uno = lectorDeFlujo(canales.abrir("d1", "g", [{ tema: "x" }]));
    const otro = lectorDeFlujo(canales.abrir("d2", "g", [{ tema: "y" }]));
    await uno.leer(); await otro.leer();
    canales.avisar("x", { hola: 1 });
    canales.avisar("nadie", 1);
    expect(await uno.leer()).toEqual(['data: {"t":"x","d":{"hola":1}}']);
    expect(await otro.leer()).toEqual([]);
  });

  it("un solo canal por dispositivo: abrir otro reemplaza al anterior (025-E07)", async () => {
    const canales = crearCanales({ cadaTanto: relojDePrueba().cadaTanto });
    const viejo = lectorDeFlujo(canales.abrir("d1", "g", [{ tema: "x" }]));
    await viejo.leer();
    lectorDeFlujo(canales.abrir("d1", "g", [{ tema: "x" }, { tema: "y" }]));
    expect(await viejo.terminado()).toBe(true);
    expect(canales.cuantos()).toBe(1);
  });

  it("dice a cada lado de un tema si el otro está, y le avisa cuando se va (023-E10)", async () => {
    const canales = crearCanales({ cadaTanto: relojDePrueba().cadaTanto });
    const compu = lectorDeFlujo(canales.abrir("c", "g1", [{ tema: "v", lado: "computadora" }]));
    expect(await compu.leer()).toEqual([A, 'data: {"t":"v","p":false}']);
    const celu = lectorDeFlujo(canales.abrir("t", "g2", [{ tema: "v", lado: "celular" }]));
    expect(await compu.leer()).toEqual(['data: {"t":"v","p":true}']);
    expect(await celu.leer()).toEqual([A, 'data: {"t":"v","p":true}']);
    await celu.cancelar();
    expect(await compu.leer()).toEqual(['data: {"t":"v","p":false}']);
  });

  it("manda latidos hasta que el dispositivo se va", async () => {
    const reloj = relojDePrueba();
    const canales = crearCanales({ cadaTanto: reloj.cadaTanto });
    const d = lectorDeFlujo(canales.abrir("d1", "g", [{ tema: "x" }]));
    await d.leer();
    reloj.latir();
    expect(await d.leer()).toEqual([": latido"]);
    await d.cancelar();
    expect(reloj.cuantos()).toBe(0);
    expect(canales.cuantos()).toBe(0);
  });

  it("pasa la tanda solo a los otros lados del mismo tema, sin guardarla (023-E25)", async () => {
    const canales = crearCanales({ cadaTanto: relojDePrueba().cadaTanto });
    const compu = lectorDeFlujo(canales.abrir("c", "g", [{ tema: "s1", lado: "computadora" }]));
    const celu = lectorDeFlujo(canales.abrir("t", "g", [{ tema: "s1", lado: "celular" }]));
    const ajena = lectorDeFlujo(canales.abrir("o", "g", [{ tema: "s2", lado: "computadora" }]));
    for (const l of [compu, celu, ajena]) await l.leer();
    expect(canales.recibir("s1", "celular", JSON.stringify(["uno", "dos"]))).toBe(204);
    expect(await compu.leer()).toEqual(['data: {"t":"s1","d":"uno"}', 'data: {"t":"s1","d":"dos"}']);
    expect(await celu.leer()).toEqual([]);
    expect(await ajena.leer()).toEqual([]);
  });

  it("rechaza lo que no es una tanda o es demasiado grande (023-E27)", () => {
    const canales = crearCanales();
    expect(canales.recibir("s1", "celular", "no es json")).toBe(400);
    expect(canales.recibir("s1", "celular", '{"m":"x"}')).toBe(400);
    expect(canales.recibir("s1", "celular", "[1]")).toBe(400);
    expect(canales.recibir("s1", "celular", JSON.stringify(["x".repeat(MAXIMO_POR_MENSAJE + 1)]))).toBe(413);
    expect(canales.recibir("s1", "celular", "x".repeat(MAXIMO_POR_TANDA + 1))).toBe(413);
  });

  it("al cerrar un tema avisa y lo saca; el canal que se queda sin temas se cierra (023-E26)", async () => {
    const reloj = relojDePrueba();
    const canales = crearCanales({ cadaTanto: reloj.cadaTanto });
    const solo = lectorDeFlujo(canales.abrir("d1", "g", [{ tema: "v", lado: "celular" }]));
    const con2 = lectorDeFlujo(canales.abrir("d2", "g", [{ tema: "v", lado: "computadora" }, { tema: "x" }]));
    await solo.leer(); await con2.leer();
    canales.cerrarTema("v");
    expect(await solo.leer()).toEqual(['data: {"t":"v","c":true}']);
    expect(await solo.terminado()).toBe(true);
    expect(await con2.leer()).toEqual(['data: {"t":"v","c":true}']);
    expect(canales.cuantos()).toBe(1);
    canales.avisar("x", 1);
    expect(await con2.leer()).toEqual(['data: {"t":"x","d":1}']);
  });

  it("cierra los canales de un grupo (se cerró la sesión: 025-E32)", async () => {
    const canales = crearCanales({ cadaTanto: relojDePrueba().cadaTanto });
    const a = lectorDeFlujo(canales.abrir("d1", "sesion-1", [{ tema: "x" }]));
    const b = lectorDeFlujo(canales.abrir("d2", "sesion-2", [{ tema: "x" }]));
    await a.leer(); await b.leer();
    canales.cerrarGrupo("sesion-1");
    expect(await a.terminado()).toBe(true);
    expect(canales.cuantos()).toBe(1);
  });

  it("no se satura: tope por grupo y total (025-E33)", () => {
    const canales = crearCanales({ cadaTanto: relojDePrueba().cadaTanto, maximo: 3, maximoPorGrupo: 2 });
    expect(canales.abrir("d1", "g", [{ tema: "x" }]).status).toBe(200);
    expect(canales.abrir("d2", "g", [{ tema: "x" }]).status).toBe(200);
    expect(canales.abrir("d3", "g", [{ tema: "x" }]).status).toBe(503);
    expect(canales.abrir("d4", "h", [{ tema: "x" }]).status).toBe(200);
    expect(canales.abrir("d5", "i", [{ tema: "x" }]).status).toBe(503);
  });

  it("el rechazo dice qué temas no da (025-E30, 025-E31)", async () => {
    const r = rechazar(403, ["vinculo:ajeno"]);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ rechazados: ["vinculo:ajeno"] });
  });

  it("sin reloj propio, usa el del sistema", async () => {
    const canales = crearCanales({ latidoMs: 20 });
    const d = lectorDeFlujo(canales.abrir("d1", "g", [{ tema: "x" }]));
    await new Promise((ok) => setTimeout(ok, 30));
    expect(await d.leer()).toContain(": latido");
    await d.cancelar();
  });
});
