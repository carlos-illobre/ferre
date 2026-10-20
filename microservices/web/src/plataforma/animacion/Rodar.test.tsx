import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Rodar } from "./Rodar";

// El número que rueda (017-T012): letra por letra, hacia arriba si sube y hacia abajo si baja;
// sin movimiento en el sistema, el texto y nada más.
const conPreferencia = (reducir: boolean) => vi.stubGlobal("matchMedia", (q: string) => ({ matches: reducir && q.includes("reduce"), media: q, addEventListener() {}, removeEventListener() {} }));
afterEach(() => { vi.unstubAllGlobals(); });

describe("Rodar", () => {
  it("al aparecer rueda desde abajo, y al bajar el número rueda hacia abajo; el texto es siempre el mismo", () => {
    conPreferencia(false);
    const { container, rerender } = render(<Rodar texto="$293.000" alAparecer />);
    expect(container.textContent).toBe("$293.000");
    expect(container.querySelectorAll(".anim-d.sube")).toHaveLength(8);
    rerender(<Rodar texto="$287.000" alAparecer />);
    expect(container.textContent).toBe("$287.000");
    expect(container.querySelectorAll(".anim-d.baja").length).toBeGreaterThan(0);
  });

  it("quien pidió menos movimiento ve el número quieto", () => {
    conPreferencia(true);
    const { container, rerender } = render(<Rodar texto="12" alAparecer />);
    rerender(<Rodar texto="13" alAparecer />);
    expect(container.querySelector(".anim-d")).toBeNull();
    expect(container.textContent).toBe("13");
  });
});
