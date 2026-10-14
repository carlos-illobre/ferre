import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { avisoDeLoQueNoSeVe, loQueNoSeVe } from "./noSeVe";

const VENTA = readFileSync(path.join(__dirname, "ejemplos/venta.bpmn"), "utf8");

// ejemplos/de-otro-programa.bpmn: un dato del programa de donde viene, un evento de borde (Procesos no lo maneja) y una
// tarea sin lugar en el dibujo.
const DE_OTRO_PROGRAMA = readFileSync(path.join(__dirname, "ejemplos/de-otro-programa.bpmn"), "utf8");

describe("lo que un BPMN importado trae y no se ve (E35)", () => {
  it("011-E35 un BPMN hecho acá no tiene nada que avisar", () => {
    expect(loQueNoSeVe(VENTA)).toEqual({ deOtroPrograma: 0, queNoManeja: 0, sinLugar: 0 });
    expect(avisoDeLoQueNoSeVe(loQueNoSeVe(VENTA), false)).toBeNull();
  });

  it("011-E35 cuenta los datos de otro programa, lo que Procesos no maneja y lo que no tiene lugar en el dibujo", () => {
    const n = loQueNoSeVe(DE_OTRO_PROGRAMA);
    expect(n).toEqual({ deOtroPrograma: 1, queNoManeja: 1, sinLugar: 1 });
    expect(avisoDeLoQueNoSeVe(n, false)).toBe("Se importó, pero hay cosas del archivo que acá no se ven: 1 elemento de BPMN que Procesos no maneja, 1 paso sin lugar en el dibujo, 1 dato del programa de donde viene. No se pierden: quedan guardadas y salen igual al exportarlo en BPMN.");
    expect(avisoDeLoQueNoSeVe(n, true)).toBe("Hay 3 partes del archivo que no se ven acá; se conservan al exportarlo.");
  });
});
