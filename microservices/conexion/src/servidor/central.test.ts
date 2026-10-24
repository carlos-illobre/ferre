import { describe, expect, it } from "vitest";
import { crearCentral, MAXIMO_POR_MENSAJE, MAXIMO_POR_TANDA } from "./index.js";
import { lectorDeFlujo } from "../pruebas/flujos.js";

// Un reloj de mentira: guarda lo que hay que repetir y lo dispara a mano.
function relojDePrueba() {
  const repetir = new Set<() => void>();
  return {
    cadaTanto: (_ms: number, hacer: () => void) => { repetir.add(hacer); return () => repetir.delete(hacer); },
    latir: () => repetir.forEach((h) => h()),
    cuantos: () => repetir.size,
  };
}

describe("central", () => {
  it("dice a cada lado si el otro está, y le avisa cuando se va (023-E10)", async () => {
    const central = crearCentral({ cadaTanto: relojDePrueba().cadaTanto });
    const compu = lectorDeFlujo(central.escuchar("s1", "computadora"));
    expect(await compu.leer()).toEqual(['data: {"p":false}']);
    const celu = lectorDeFlujo(central.escuchar("s1", "celular"));
    expect(await compu.leer()).toEqual(['data: {"p":true}']);
    expect(await celu.leer()).toEqual(['data: {"p":true}']);
    await celu.cancelar();
    expect(await compu.leer()).toEqual(['data: {"p":false}']);
  });

  it("responde como flujo de eventos y manda latidos hasta que el lado se va", async () => {
    const reloj = relojDePrueba();
    const central = crearCentral({ cadaTanto: reloj.cadaTanto });
    const respuesta = central.escuchar("s1", "computadora");
    expect(respuesta.headers.get("Content-Type")).toBe("text/event-stream");
    const compu = lectorDeFlujo(respuesta);
    await compu.leer();
    reloj.latir();
    expect(await compu.leer()).toEqual([": latido"]);
    await compu.cancelar();
    expect(reloj.cuantos()).toBe(0);
  });

  it("pasa la tanda solo a los otros lados de la misma sala, sin guardarla (023-E25)", async () => {
    const central = crearCentral({ cadaTanto: relojDePrueba().cadaTanto });
    const compu = lectorDeFlujo(central.escuchar("s1", "computadora"));
    const celu = lectorDeFlujo(central.escuchar("s1", "celular"));
    const ajena = lectorDeFlujo(central.escuchar("s2", "computadora"));
    for (const l of [compu, celu, ajena]) await l.leer();
    expect(central.recibir("s1", "celular", JSON.stringify(["uno", "dos"]))).toBe(204);
    expect(await compu.leer()).toEqual(['data: {"m":"uno"}', 'data: {"m":"dos"}']);
    expect(await celu.leer()).toEqual([]);
    expect(await ajena.leer()).toEqual([]);
    // Sin nadie escuchando, se acepta y no se guarda.
    expect(central.recibir("vacia", "celular", "[]")).toBe(204);
  });

  it("rechaza lo que no es una tanda o es demasiado grande (023-E27)", () => {
    const central = crearCentral();
    expect(central.recibir("s1", "celular", "no es json")).toBe(400);
    expect(central.recibir("s1", "celular", '{"m":"x"}')).toBe(400);
    expect(central.recibir("s1", "celular", "[1]")).toBe(400);
    expect(central.recibir("s1", "celular", JSON.stringify(["x".repeat(MAXIMO_POR_MENSAJE + 1)]))).toBe(413);
    expect(central.recibir("s1", "celular", "x".repeat(MAXIMO_POR_TANDA + 1))).toBe(413);
  });

  it("al cerrar la sala les avisa a todos y les corta el flujo (023-E26)", async () => {
    const reloj = relojDePrueba();
    const central = crearCentral({ cadaTanto: reloj.cadaTanto });
    const compu = lectorDeFlujo(central.escuchar("s1", "computadora"));
    const celu = lectorDeFlujo(central.escuchar("s1", "celular"));
    await compu.leer(); await celu.leer();
    central.cerrar("s1");
    expect(await compu.leer()).toEqual(['data: {"c":true}']);
    expect(await celu.leer()).toEqual(['data: {"c":true}']);
    expect(await celu.terminado()).toBe(true);
    expect(reloj.cuantos()).toBe(0);
    // Después de cerrada, lo que llega no le llega a nadie.
    expect(central.recibir("s1", "celular", '["x"]')).toBe(204);
  });

  it("sin reloj propio, usa el del sistema", async () => {
    const central = crearCentral({ latidoMs: 20 });
    const compu = lectorDeFlujo(central.escuchar("s1", "computadora"));
    await new Promise((ok) => setTimeout(ok, 30));
    expect(await compu.leer()).toContain(": latido");
    await compu.cancelar();
  });
});
