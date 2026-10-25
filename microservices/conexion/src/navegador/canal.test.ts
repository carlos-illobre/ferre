import { describe, expect, it } from "vitest";
import { crearCanal } from "./canal.js";
import { fetchDePrueba, relojDePrueba, soltar } from "../pruebas/red.js";
import { vistaDePrueba } from "../pruebas/vista.js";

function armar() {
  const red = fetchDePrueba();
  const vista = vistaDePrueba();
  const canal = crearCanal({ url: "/canal", cabeceras: () => ({ Authorization: "Bearer t" }), fetch: red.fetch, esperar: relojDePrueba().esperar, vista });
  const visto: unknown[] = [];
  canal.eventos.escuchar((e) => visto.push(e));
  canal.estado.escuchar((e) => visto.push(e));
  canal.rechazos.escuchar((r) => visto.push(r));
  const gets = () => red.pedidos.filter((p) => p.metodo === "GET");
  return { red, vista, canal, visto, gets };
}

describe("canal", () => {
  it("sin temas no abre nada; con temas abre uno solo con todos, en una cabecera (025-E03, E07)", async () => {
    const { canal, gets, visto } = armar();
    canal.poner([]);
    await soltar();
    expect(gets()).toHaveLength(0);
    canal.poner([{ t: "a" }]);
    canal.poner([{ t: "a" }, { t: "b", k: "secreto" }]);
    await soltar();
    expect(gets()).toHaveLength(1);
    expect(gets()[0]!.cabeceras).toEqual({ Authorization: "Bearer t", "X-Temas": '[{"t":"a"},{"t":"b","k":"secreto"}]' });
    expect(visto).toEqual(["abriendo", "abierto"]);
  });

  it("si los temas no cambian, no reconecta; si cambian, sí; sin temas, se cierra (025-E05)", async () => {
    const { red, canal, gets, visto } = armar();
    canal.poner([{ t: "a" }]);
    await soltar();
    canal.poner([{ t: "a" }]);
    await soltar();
    expect(gets()).toHaveLength(1);
    canal.poner([{ t: "b" }]);
    await soltar();
    expect(gets()).toHaveLength(2);
    expect(red.flujos[0]!.cerrado).toBe(true);
    // Al cambiar de temas dice que se cerró antes de volver a abrir: el servidor lo vio irse.
    expect(visto.slice(2, 5)).toEqual(["cerrado", "abriendo", "abierto"]);
    canal.poner([]);
    await soltar();
    expect(red.flujos[1]!.cerrado).toBe(true);
    expect(visto.slice(-1)).toEqual(["cerrado"]);
  });

  it("con la página oculta se cierra; al volver a la vista se abre (025-E05, E24)", async () => {
    const { red, vista, canal, gets } = armar();
    canal.poner([{ t: "a" }]);
    await soltar();
    vista.poner(false);
    await soltar();
    expect(red.flujos[0]!.cerrado).toBe(true);
    canal.poner([{ t: "b" }]);
    await soltar();
    expect(gets()).toHaveLength(1);
    vista.poner(true);
    await soltar();
    expect(gets()).toHaveLength(2);
  });

  it("entrega lo que llega validado y descarta lo que no tiene la forma (025-E34)", async () => {
    const { red, canal, visto } = armar();
    canal.poner([{ t: "a" }]);
    await soltar();
    red.ultimo().escribir('data: {"t":"a","d":1}\n\ndata: basura\n\ndata: {"a":{"version":"v1"}}\n\n');
    await soltar();
    expect(visto.slice(2)).toEqual([{ t: "a", d: 1 }, { a: { version: "v1" } }]);
  });

  it("si se corta lo dice; reconectar corta y vuelve a abrir solo", async () => {
    const { red, canal, visto } = armar();
    canal.reconectar(); // cerrado: no hace nada
    canal.poner([{ t: "a" }]);
    await soltar();
    canal.reconectar();
    await soltar();
    expect(red.flujos[0]!.cerrado).toBe(true);
    expect(visto).toContain("cortado");
  });

  it("si el servidor rechaza temas, lo dice y no insiste hasta que los temas cambien", async () => {
    const { red, canal, gets, visto } = armar();
    red.contestarCon(() => new Response('{"rechazados":["b"]}', { status: 403 }));
    canal.poner([{ t: "a" }, { t: "b" }]);
    await soltar(); await soltar();
    expect(visto).toContainEqual({ estado: 403, temas: ["b"] });
    red.contestarCon(() => new Response(null, { status: 401 }));
    canal.poner([{ t: "a" }]);
    await soltar(); await soltar();
    expect(visto).toContainEqual({ estado: 401, temas: ["a"] });
    expect(gets()).toHaveLength(2);
  });
});
