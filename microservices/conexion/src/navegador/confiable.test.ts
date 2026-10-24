import { describe, expect, it } from "vitest";
import { crearConfiable, TAMANO_DE_PARTE } from "./confiable.js";
import { leer, type Mensaje } from "../comun/mensajes.js";

// Dos puntas unidas por un caño que se puede cortar, demorar o desordenar a mano.
function dosPuntas() {
  let reloj = 0;
  const ahora = () => reloj;
  const enCamino = { a: [] as string[], b: [] as string[] }; // lo que va hacia cada punta
  const crear = (yo: "a" | "b", epoca: string) => {
    const otra = yo === "a" ? "b" : "a";
    const c = crearConfiable({ epoca, ahora, enviar: (t) => enCamino[otra].push(t) });
    const recibidos: string[] = [];
    c.entregas.escuchar((d) => recibidos.push(d));
    return { c, recibidos };
  };
  const puntas = { a: crear("a", "A1"), b: crear("b", "B1") };
  // Entrega a una punta lo que va hacia ella (en el orden en que está).
  const recibir = (hacia: "a" | "b", quitar = (l: string[]) => l.splice(0)) => {
    for (const t of quitar(enCamino[hacia])) {
      const m = leer(t) as Mensaje;
      const c = puntas[hacia].c;
      if (m.t === "hola") c.alSaludo(m);
      if (m.t === "dato") c.alDato(m);
      if (m.t === "ok") c.alConfirmacion(m);
    }
  };
  const ida_y_vuelta = () => { for (let i = 0; i < 4; i++) { recibir("a"); recibir("b"); } };
  return { puntas, enCamino, recibir, ida_y_vuelta, avanzar: (ms: number) => { reloj += ms; }, recrear: (yo: "a" | "b", epoca: string) => { puntas[yo] = crear(yo, epoca); } };
}

describe("entrega confiable", () => {
  it("entrega en orden y una sola vez, y confirma (023-E03)", async () => {
    const t = dosPuntas();
    t.puntas.a.c.saludar(); t.puntas.b.c.saludar(); t.ida_y_vuelta();
    let confirmado = false;
    void t.puntas.a.c.mandar("uno").then(() => { confirmado = true; });
    void t.puntas.a.c.mandar("dos");
    // Llega desordenado y repetido.
    const [uno, dos] = [...t.enCamino.b];
    t.enCamino.b.splice(0, 2, dos!, uno!, dos!);
    t.ida_y_vuelta();
    await Promise.resolve();
    expect(t.puntas.b.recibidos).toEqual(["uno", "dos"]);
    expect(confirmado).toBe(true);
  });

  it("lo que no llegó se reenvía al volver a saludarse (023-E18)", () => {
    const t = dosPuntas();
    t.puntas.a.c.saludar(); t.puntas.b.c.saludar(); t.ida_y_vuelta();
    void t.puntas.a.c.mandar("uno");
    t.enCamino.b.length = 0; // se perdió
    t.puntas.a.c.saludar(); t.puntas.b.c.saludar(); t.ida_y_vuelta();
    expect(t.puntas.b.recibidos).toEqual(["uno"]);
  });

  it("si el otro recarga, le llega lo que faltaba y no lo que ya tenía (023-E29)", () => {
    const t = dosPuntas();
    t.puntas.a.c.saludar(); t.puntas.b.c.saludar(); t.ida_y_vuelta();
    void t.puntas.a.c.mandar("uno");
    t.ida_y_vuelta();
    void t.puntas.a.c.mandar("dos");
    t.enCamino.b.length = 0; // el otro recarga antes de recibir «dos»
    t.recrear("b", "B2");
    t.puntas.a.c.saludar(); t.puntas.b.c.saludar(); t.ida_y_vuelta();
    expect(t.puntas.b.recibidos).toEqual(["dos"]);
  });

  it("descarta los datos de una época que no conoce", () => {
    const t = dosPuntas();
    void t.puntas.a.c.mandar("uno");
    t.recibir("b");
    expect(t.puntas.b.recibidos).toEqual([]);
    expect(t.enCamino.a).toEqual([]);
  });

  it("lo grande viaja en partes y llega entero (023-E30)", () => {
    const t = dosPuntas();
    t.puntas.a.c.saludar(); t.puntas.b.c.saludar(); t.ida_y_vuelta();
    const foto = "f".repeat(TAMANO_DE_PARTE * 2 + 5);
    void t.puntas.a.c.mandar(foto);
    void t.puntas.a.c.mandar("");
    expect(t.enCamino.b).toHaveLength(4);
    t.ida_y_vuelta();
    expect(t.puntas.b.recibidos).toEqual([foto, ""]);
  });

  it("mide la demora de la confirmación, desde el último envío", () => {
    const t = dosPuntas();
    const demoras: number[] = [];
    t.puntas.a.c.demoras.escuchar((d) => demoras.push(d));
    t.puntas.a.c.saludar(); t.puntas.b.c.saludar(); t.ida_y_vuelta();
    void t.puntas.a.c.mandar("uno");
    t.avanzar(40);
    t.ida_y_vuelta();
    expect(demoras).toEqual([40]);
  });

  it("ignora la confirmación de otra época", () => {
    const t = dosPuntas();
    t.puntas.a.c.alConfirmacion({ t: "ok", e: "otra", h: 10 });
    t.puntas.a.c.alSaludo({ t: "hola", e: "B1", desde: 1, re: "otra", rh: 10 });
    let confirmado = false;
    void t.puntas.a.c.mandar("uno").then(() => { confirmado = true; });
    expect(confirmado).toBe(false);
  });
});
