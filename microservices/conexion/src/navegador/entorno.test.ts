import { describe, expect, it } from "vitest";
import { redDe, vistaDe } from "./entorno.js";

// Un documento o una ventana de mentira: lo justo para escuchar eventos.
const lugar = (visibilityState = "visible") => Object.assign(new EventTarget(), { visibilityState });

describe("entorno", () => {
  it("la vista dice si la página se ve y avisa cuando cambia", () => {
    const documento = lugar();
    const vista = vistaDe(documento);
    let cambios = 0;
    const dejar = vista.alCambiar(() => cambios++);
    expect(vista.visible()).toBe(true);
    documento.visibilityState = "hidden";
    documento.dispatchEvent(new Event("visibilitychange"));
    expect([vista.visible(), cambios]).toEqual([false, 1]);
    dejar();
    documento.dispatchEvent(new Event("visibilitychange"));
    expect(cambios).toBe(1);
  });

  it("la red avisa cuando se va y cuando vuelve", () => {
    const ventana = lugar();
    const visto: boolean[] = [];
    const dejar = redDe(ventana).alCambiar((enLinea) => visto.push(enLinea));
    ventana.dispatchEvent(new Event("offline"));
    ventana.dispatchEvent(new Event("online"));
    dejar();
    ventana.dispatchEvent(new Event("offline"));
    expect(visto).toEqual([false, true]);
  });

  it("fuera del navegador: siempre a la vista y sin avisos de red", () => {
    const vista = vistaDe(undefined);
    expect(vista.visible()).toBe(true);
    vista.alCambiar(() => {})();
    redDe(undefined).alCambiar(() => {})();
  });
});
