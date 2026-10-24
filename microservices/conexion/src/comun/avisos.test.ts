import { describe, expect, it } from "vitest";
import { crearAvisos } from "./avisos.js";

describe("avisos", () => {
  it("le avisa a cada oyente y deja de avisarle al que se da de baja", () => {
    const avisos = crearAvisos<number>();
    const a: number[] = [];
    const b: number[] = [];
    const dejarA = avisos.escuchar((v) => a.push(v));
    avisos.escuchar((v) => b.push(v));
    avisos.avisar(1);
    dejarA();
    avisos.avisar(2);
    expect(a).toEqual([1]);
    expect(b).toEqual([1, 2]);
  });

  it("un oyente se puede dar de baja mientras se le avisa", () => {
    const avisos = crearAvisos<void>();
    let veces = 0;
    const dejar = avisos.escuchar(() => { veces += 1; dejar(); });
    avisos.avisar();
    avisos.avisar();
    expect(veces).toBe(1);
  });
});
