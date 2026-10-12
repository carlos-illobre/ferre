import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EVENTO_VERSION_NUEVA, VersionNueva } from "./VersionNueva";

// Una versión nueva con la app en uso se avisa; no se recarga sola (se perdería lo que se está haciendo).
describe("Aviso de versión nueva", () => {
  it("no se ve hasta que hay una versión nueva, y actualizar es un botón", () => {
    render(<VersionNueva />);
    expect(screen.queryByTestId("version-nueva")).toBeNull();
    const actualizar = vi.fn();
    act(() => { window.dispatchEvent(new CustomEvent(EVENTO_VERSION_NUEVA, { detail: { actualizar } })); });
    expect(screen.getByTestId("version-nueva").textContent).toContain("Hay una versión nueva");
    expect(actualizar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar ahora" }));
    expect(actualizar).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Actualizando…" })).toHaveProperty("disabled", true);
  });
});
