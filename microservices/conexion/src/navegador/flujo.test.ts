import { describe, expect, it } from "vitest";
import { escucharFlujo, ESPERA_PARA_RECONECTAR_MS } from "./flujo.js";
import { fetchDePrueba, relojDePrueba, soltar } from "../pruebas/red.js";

function armar() {
  const red = fetchDePrueba();
  const reloj = relojDePrueba();
  const visto: string[] = [];
  const flujo = escucharFlujo({
    url: "/sala", cabeceras: () => ({ Authorization: "Bearer t" }), fetch: red.fetch, esperar: reloj.esperar,
    alAbrir: () => visto.push("abierto"), alEvento: (d) => visto.push(d), alCortar: () => visto.push("cortado"), alRechazar: (e) => visto.push(`rechazo ${e}`),
  });
  return { red, reloj, visto, flujo };
}

describe("flujo de eventos", () => {
  it("entrega los datos de cada evento completo, sin los latidos, con las cabeceras", async () => {
    const { red, visto } = armar();
    await soltar();
    expect(red.pedidos[0]!.cabeceras).toEqual({ Authorization: "Bearer t" });
    red.ultimo().escribir(': latido\n\ndata: {"p":true}\n\ndata: uno');
    red.ultimo().escribir("\ndata: dos\n\n");
    await soltar();
    expect(visto).toEqual(["abierto", '{"p":true}', "uno\ndos"]);
  });

  it("si se corta, vuelve a conectar a los 3 segundos", async () => {
    const { red, reloj, visto } = armar();
    await soltar();
    red.ultimo().terminar();
    await soltar();
    expect(visto).toEqual(["abierto", "cortado"]);
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await soltar();
    expect(red.pedidos).toHaveLength(2);
  });

  it("si el servidor contesta otro error o la red falla, también reconecta", async () => {
    const { red, reloj, visto } = armar();
    red.contestarCon(() => new Response(null, { status: 500 }));
    await soltar();
    red.ultimo().fallar();
    await soltar();
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await soltar();
    red.contestarCon(() => Promise.reject(new Error("sin red")));
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await soltar();
    expect(visto).toEqual(["abierto", "cortado", "cortado", "cortado"]);
  });

  it("una respuesta sin cuerpo cuenta como corte", async () => {
    const { red, reloj, visto } = armar();
    await soltar();
    red.contestarCon(() => new Response(null, { status: 200 }));
    red.ultimo().terminar();
    await soltar();
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await soltar();
    expect(visto).toEqual(["abierto", "cortado", "cortado"]);
  });

  it("si el servidor dice que no, no insiste", async () => {
    const red = fetchDePrueba();
    red.contestarCon(() => new Response(null, { status: 404 }));
    const reloj = relojDePrueba();
    const visto: string[] = [];
    escucharFlujo({ url: "/s", cabeceras: () => ({}), fetch: red.fetch, esperar: reloj.esperar, alAbrir: () => {}, alEvento: () => {}, alCortar: () => visto.push("cortado"), alRechazar: (e) => visto.push(`rechazo ${e}`) });
    await soltar();
    expect(visto).toEqual(["rechazo 404"]);
    expect(reloj.pendientes()).toBe(0);
  });

  it("reconectar corta y vuelve a conectar; cerrar no vuelve más", async () => {
    const { red, reloj, flujo, visto } = armar();
    await soltar();
    flujo.reconectar();
    await soltar();
    expect(visto).toEqual(["abierto", "cortado"]);
    flujo.cerrar();
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await soltar();
    expect(red.pedidos).toHaveLength(1);
  });

  it("cerrar con la conexión abierta no avisa ningún corte", async () => {
    const { flujo, visto } = armar();
    await soltar();
    flujo.cerrar();
    await soltar();
    expect(visto).toEqual(["abierto"]);
  });
});
