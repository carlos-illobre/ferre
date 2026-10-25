import { describe, expect, it } from "vitest";
import { crearCaminoServidor, MAXIMO_POR_POST } from "./servidor.js";
import { soltar } from "../pruebas/red.js";
import { aperturas, centralDePrueba } from "../pruebas/central.js";

function armar() {
  const t = centralDePrueba();
  const camino = crearCaminoServidor({ central: t.central, tema: "v", lado: "celular", url: "/canal/v" });
  const visto: unknown[] = [];
  camino.estado.escuchar((e) => visto.push(e));
  camino.mensajes.escuchar((m) => visto.push(`m:${m}`));
  camino.cerrada.escuchar(() => visto.push("cerrada"));
  camino.rechazado.escuchar((e) => visto.push(`rechazo ${e}`));
  return { ...t, camino, visto };
}
const posts = (red: ReturnType<typeof centralDePrueba>["red"]) => red.pedidos.filter((p) => p.metodo === "POST");

describe("camino por el servidor", () => {
  it("toma el tema en el canal, con su lado; dice si el otro está y entrega lo que manda (023-E08)", async () => {
    const { red, camino, visto } = armar();
    camino.tomar();
    camino.tomar(); // ya lo tiene: no cambia nada
    await soltar();
    expect(aperturas(red)).toEqual([[{ t: "v", l: "celular" }]]);
    red.ultimo().escribir('data: {"t":"v","p":true}\n\ndata: {"t":"v","d":"hola"}\n\ndata: {"t":"v","d":{"no":"texto"}}\n\n');
    await soltar();
    red.ultimo().terminar();
    await soltar();
    expect(visto).toEqual([{ conectado: true, otro: true }, "m:hola", { conectado: false, otro: false }]);
  });

  it("al soltar el tema, el canal se cierra (la directa ya anda: 025-E21)", async () => {
    const { red, camino } = armar();
    camino.tomar();
    await soltar();
    camino.soltar();
    camino.soltar();
    await soltar();
    expect(red.pedidos.filter((p) => p.metodo === "GET")).toHaveLength(1);
    expect(red.flujos[0]!.cerrado).toBe(true);
  });

  it("manda de a un pedido por vez; lo que se junta va en el siguiente, en orden (023-E08)", async () => {
    const { red, camino } = armar();
    let soltarPost!: () => void;
    red.contestarCon((p) => (p.metodo === "GET" ? "flujo" : new Promise((ok) => { soltarPost = () => ok(new Response(null, { status: 204 })); })));
    camino.mandar("uno");
    camino.mandar("dos");
    camino.mandar("tres");
    await soltar();
    expect(posts(red).map((p) => p.cuerpo)).toEqual(['["uno"]']);
    expect(posts(red)[0]!.cabeceras).toEqual({ Authorization: "Bearer t", "Content-Type": "application/json" });
    soltarPost();
    await soltar();
    expect(posts(red).map((p) => p.cuerpo)).toEqual(['["uno"]', '["dos","tres"]']);
  });

  it("parte en varios pedidos lo que no entra en uno", async () => {
    const { red, camino } = armar();
    const grande = "x".repeat(MAXIMO_POR_POST / 2 + 1);
    camino.mandar(grande); // sale solo
    camino.mandar(grande);
    camino.mandar(grande);
    await soltar(); await soltar(); await soltar();
    expect(posts(red).map((p) => (JSON.parse(p.cuerpo!) as string[]).length)).toEqual([1, 1, 1]);
  });

  it("si un pedido falla, descarta lo que esperaba y reconecta el canal", async () => {
    const { red, camino } = armar();
    camino.tomar();
    await soltar();
    red.contestarCon((p) => (p.metodo === "GET" ? "flujo" : new Response(null, { status: 500 })));
    camino.mandar("uno");
    camino.mandar("dos");
    await soltar(); await soltar();
    expect(posts(red)).toHaveLength(1);
    expect(red.flujos[0]!.cerrado).toBe(true);
  });

  it("si el servidor cierra el tema, lo avisa y no lo vuelve a pedir (023-E26)", async () => {
    const { red, camino, visto } = armar();
    camino.tomar();
    await soltar();
    red.ultimo().escribir('data: {"t":"v","c":true}\n\n');
    await soltar();
    camino.soltar();
    expect(visto).toEqual(["cerrada"]);
  });

  it("avisa si el servidor no le da el tema", async () => {
    const { red, camino, visto } = armar();
    red.contestarCon(() => new Response('{"rechazados":["v"]}', { status: 403 }));
    camino.tomar();
    await soltar(); await soltar();
    expect(visto).toEqual(["rechazo 403"]);
  });
});
