import { describe, expect, it } from "vitest";
import { crearCaminoServidor, MAXIMO_POR_POST } from "./servidor.js";
import { ESPERA_PARA_RECONECTAR_MS } from "./flujo.js";
import { fetchDePrueba, relojDePrueba, soltar } from "../pruebas/red.js";

function armar() {
  const red = fetchDePrueba();
  const reloj = relojDePrueba();
  const camino = crearCaminoServidor({ url: "/sala", cabeceras: () => ({ Authorization: "Bearer t" }), fetch: red.fetch, esperar: reloj.esperar });
  const visto: unknown[] = [];
  camino.estado.escuchar((e) => visto.push(e));
  camino.mensajes.escuchar((m) => visto.push(`m:${m}`));
  camino.cerrada.escuchar(() => visto.push("cerrada"));
  camino.rechazado.escuchar((e) => visto.push(`rechazo ${e}`));
  return { red, reloj, camino, visto };
}
const posts = (red: ReturnType<typeof fetchDePrueba>) => red.pedidos.filter((p) => p.metodo === "POST");

describe("camino por el servidor", () => {
  it("dice si está conectado y si el otro está, y entrega lo que manda el otro (023-E08)", async () => {
    const { red, visto } = armar();
    await soltar();
    red.ultimo().escribir('data: {"p":true}\n\ndata: {"m":"hola"}\n\n');
    await soltar();
    red.ultimo().terminar();
    await soltar();
    expect(visto).toEqual([{ conectado: true, otro: false }, { conectado: true, otro: true }, "m:hola", { conectado: false, otro: false }]);
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

  it("si un pedido falla, descarta lo que esperaba y reconecta el flujo", async () => {
    const { red, reloj, camino, visto } = armar();
    await soltar();
    red.contestarCon((p) => (p.metodo === "GET" ? "flujo" : new Response(null, { status: 500 })));
    camino.mandar("uno");
    camino.mandar("dos");
    await soltar(); await soltar();
    expect(posts(red)).toHaveLength(1);
    expect(visto).toContainEqual({ conectado: false, otro: false });
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await soltar();
    expect(red.pedidos.filter((p) => p.metodo === "GET")).toHaveLength(2);
  });

  it("si la central cierra la sala, deja de escuchar y lo avisa (023-E26)", async () => {
    const { red, reloj, visto } = armar();
    await soltar();
    red.ultimo().escribir('data: {"c":true}\n\n');
    await soltar();
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    expect(visto).toEqual([{ conectado: true, otro: false }, "cerrada"]);
    expect(red.pedidos).toHaveLength(1);
  });

  it("avisa si el servidor no lo deja escuchar, y se puede cerrar", async () => {
    const red = fetchDePrueba();
    red.contestarCon(() => new Response(null, { status: 401 }));
    const camino = crearCaminoServidor({ url: "/s", cabeceras: () => ({}), fetch: red.fetch, esperar: relojDePrueba().esperar });
    const visto: number[] = [];
    camino.rechazado.escuchar((e) => visto.push(e));
    await soltar();
    camino.cerrar();
    expect(visto).toEqual([401]);
  });
});
