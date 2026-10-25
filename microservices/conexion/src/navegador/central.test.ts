import { describe, expect, it, vi } from "vitest";
import { soltar } from "../pruebas/red.js";
import { aperturas, centralDePrueba } from "../pruebas/central.js";
import { crearCentral } from "./central.js";

describe("central de avisos", () => {
  it("una espera temporaria abre el canal; al dejarla, se cierra (025-E03, 025-E05, 025-E27, 025-E29)", async () => {
    const { central, red } = centralDePrueba();
    const avisos: unknown[] = [];
    const dejar = central.vigilar({ tema: "entrada:1", temporaria: true, clave: "s", alAviso: (d) => avisos.push(d) });
    await soltar();
    expect(aperturas(red)).toEqual([[{ t: "entrada:1", k: "s" }]]);
    red.ultimo().escribir('data: {"t":"entrada:1","d":{"listo":true}}\n\ndata: {"t":"otro","d":1}\n\n');
    await soltar();
    expect(avisos).toEqual([{ listo: true }]);
    dejar();
    dejar(); // dos veces no cambia nada
    await soltar();
    expect(red.flujos[0]!.cerrado).toBe(true);
  });

  it("una permanente nunca abre el canal, pero viaja gratis si otra lo abre (025-E08, 025-E11, 025-E28)", async () => {
    const { central, red } = centralDePrueba();
    const sesion: unknown[] = [];
    central.vigilar({ tema: "sesion:1", alAviso: (d) => sesion.push(d) });
    await soltar();
    expect(red.pedidos).toHaveLength(0);
    central.vigilar({ tema: "puesto:1", temporaria: true, lado: "computadora" });
    await soltar();
    expect(aperturas(red)).toEqual([[{ t: "sesion:1" }, { t: "puesto:1", l: "computadora" }]]);
    red.ultimo().escribir('data: {"t":"sesion:1","d":{"cerrada":true}}\n\n');
    await soltar();
    expect(sesion).toEqual([{ cerrada: true }]);
    // Una que se sabe solo a cuestas no se pide en el canal: no lo vuelve a abrir.
    central.vigilar({ tema: "version", aCuestas: true });
    await soltar();
    expect(aperturas(red)).toHaveLength(1);
    // Otra permanente que llega con el canal abierto lo vuelve a abrir con ella.
    central.vigilar({ tema: "sesion:2" });
    await soltar();
    expect(aperturas(red)).toHaveLength(2);
  });

  it("lo que va a cuestas avisa solo cuando cambia; el primero queda de referencia (025-E09, 025-E23)", async () => {
    const { central, red } = centralDePrueba();
    const versiones: unknown[] = [];
    central.vigilar({ tema: "version", alAviso: (v) => versiones.push(v) });
    central.respondio('{"version":"v1"}');
    central.respondio('{"version":"v1"}');
    central.respondio(null);
    central.respondio("no es json");
    expect(versiones).toEqual([]);
    central.respondio('{"version":"v2","otro":3}');
    expect(versiones).toEqual(["v2"]);
    // También al abrir el canal (el servidor se reinició con otra versión).
    central.vigilar({ tema: "x", temporaria: true });
    await soltar();
    red.ultimo().escribir('data: {"a":{"version":"v3"}}\n\n');
    await soltar();
    expect(versiones).toEqual(["v2", "v3"]);
  });

  it("cuenta lo que pasa con la conexión, para los indicadores (025-E12, 025-E13)", async () => {
    const { central, red, cambiarLaRed } = centralDePrueba();
    const sucesos: string[] = [];
    central.sucesos.escuchar((s) => sucesos.push(s));
    central.respondio(null);
    central.fallo();
    cambiarLaRed(false);
    cambiarLaRed(true);
    const dejar = central.vigilar({ tema: "x", temporaria: true });
    await soltar();
    red.ultimo().terminar();
    await soltar();
    dejar();
    await soltar();
    expect(sucesos).toEqual(["contesto", "fallo", "sin-red", "con-red", "abriendo", "abierto", "cortado"]);
  });

  it("dice a cada espera con lado si el canal está y si el otro está (023-E10)", async () => {
    const { central, red, vista } = centralDePrueba();
    const estados: unknown[] = [];
    central.vigilar({ tema: "v", temporaria: true, lado: "celular", alEstado: (e) => estados.push(e) });
    await soltar();
    red.ultimo().escribir('data: {"t":"v","p":true}\n\n');
    await soltar();
    vista.poner(false);
    await soltar();
    expect(estados).toEqual([{ conectado: true, otro: true }, { conectado: false, otro: false }]);
  });

  it("si el servidor cierra un tema o lo rechaza, esa espera termina y el canal sigue con las demás (025-E31)", async () => {
    const { central, red } = centralDePrueba();
    const visto: unknown[] = [];
    central.vigilar({ tema: "a", temporaria: true, alCerrar: () => visto.push("a cerrado") });
    central.vigilar({ tema: "b", temporaria: true, alRechazo: (e) => visto.push(`b ${e}`) });
    central.vigilar({ tema: "c", temporaria: true });
    await soltar();
    // Desde ahora el servidor no da «b».
    red.contestarCon((p) => (p.cabeceras["X-Temas"]!.includes('"b"') ? new Response('{"rechazados":["b"]}', { status: 403 }) : "flujo"));
    red.ultimo().escribir('data: {"t":"a","c":true}\n\n');
    await soltar(); await soltar(); await soltar(); await soltar();
    expect(visto).toEqual(["a cerrado", "b 403"]);
    expect(aperturas(red).slice(-1)).toEqual([[{ t: "c" }]]);
  });

  it("si el servidor no da un tema permanente, la espera sigue (a cuestas) y el canal se abre sin él", async () => {
    const { central, red } = centralDePrueba();
    const visto: unknown[] = [];
    central.vigilar({ tema: "sesion:vieja", alAviso: (v) => visto.push(v), alRechazo: (e) => visto.push(`rechazo ${e}`) });
    red.contestarCon((p) => (p.cabeceras["X-Temas"]!.includes("sesion:vieja") ? new Response('{"rechazados":["sesion:vieja"]}', { status: 403 }) : "flujo"));
    central.vigilar({ tema: "x", temporaria: true });
    for (let i = 0; i < 6; i++) await soltar();
    expect(visto).toEqual(["rechazo 403"]);
    expect(aperturas(red).at(-1)).toEqual([{ t: "x" }]);
    central.respondio('{"sesion:vieja":1}');
    central.respondio('{"sesion:vieja":2}');
    expect(visto).toEqual(["rechazo 403", 2]);
  });

  it("sin nada propio, usa lo del navegador", async () => {
    const fetch = vi.fn(async () => { throw new TypeError("sin red"); });
    vi.stubGlobal("fetch", fetch);
    const central = crearCentral({ url: "/canal" });
    const dejar = central.vigilar({ tema: "x", temporaria: true });
    await soltar();
    dejar();
    vi.unstubAllGlobals();
    expect(fetch).toHaveBeenCalledWith("/canal", expect.objectContaining({ headers: { "X-Temas": '[{"t":"x"}]' } }));
  });
});
