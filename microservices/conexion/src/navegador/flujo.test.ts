import { describe, expect, it } from "vitest";
import { escucharFlujo, ESPERA_MAXIMA_MS, ESPERA_PARA_RECONECTAR_MS } from "./flujo.js";
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
    // Sin poder conectar, cada vez espera el doble: 6 segundos.
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS * 2);
    await soltar();
    expect(visto).toEqual(["abierto", "cortado", "cortado", "cortado"]);
  });

  it("sin poder conectar espera cada vez el doble, hasta un minuto; al abrir vuelve a los 3 segundos", async () => {
    const { red, reloj, visto } = armar();
    red.contestarCon(() => Promise.reject(new Error("sin red")));
    red.ultimo().fallar();
    await soltar();
    const esperas: number[] = [];
    for (let ms = ESPERA_PARA_RECONECTAR_MS; esperas.length < 6; ms = Math.min(ms * 2, ESPERA_MAXIMA_MS)) {
      const antes = red.pedidos.length;
      reloj.avanzar(ms - 1);
      await soltar();
      expect(red.pedidos.length).toBe(antes);
      reloj.avanzar(1);
      await soltar();
      esperas.push(ms);
    }
    expect(esperas).toEqual([3_000, 6_000, 12_000, 24_000, 48_000, 60_000]);
    red.contestarCon(() => "flujo");
    reloj.avanzar(ESPERA_MAXIMA_MS);
    await soltar();
    red.ultimo().fallar();
    await soltar();
    const antes = red.pedidos.length;
    reloj.avanzar(ESPERA_PARA_RECONECTAR_MS);
    await soltar();
    expect(red.pedidos.length).toBe(antes + 1);
    expect(visto.slice(-3)).toEqual(["abierto", "cortado", "abierto"]);
  });

  it("si se cierra mientras espera la respuesta, lo que conteste no cuenta", async () => {
    const red = fetchDePrueba();
    let contestar!: (r: Response) => void;
    red.contestarCon(() => new Promise<Response>((ok) => { contestar = ok; }));
    const visto: string[] = [];
    const flujo = escucharFlujo({ url: "/s", cabeceras: () => ({}), fetch: red.fetch, esperar: relojDePrueba().esperar, alAbrir: () => visto.push("abierto"), alEvento: () => {}, alCortar: () => visto.push("cortado"), alRechazar: (e) => visto.push(`rechazo ${e}`) });
    await soltar();
    flujo.cerrar();
    contestar(new Response(null, { status: 403 }));
    await soltar();
    expect(visto).toEqual([]);
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
    red.contestarCon(() => new Response('{"rechazados":["x"]}', { status: 404 }));
    const reloj = relojDePrueba();
    const visto: string[] = [];
    escucharFlujo({ url: "/s", cabeceras: () => ({}), fetch: red.fetch, esperar: reloj.esperar, alAbrir: () => {}, alEvento: () => {}, alCortar: () => visto.push("cortado"), alRechazar: (e, cuerpo) => visto.push(`rechazo ${e} ${cuerpo}`) });
    await soltar();
    expect(visto).toEqual(['rechazo 404 {"rechazados":["x"]}']);
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
