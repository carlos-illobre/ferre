import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useDebounce } from "./debounce";

// La búsqueda de Productos espera 150 ms a que se deje de tipear.
describe("useDebounce", () => {
  it("devuelve el valor recién después de la espera, y solo el último", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ v }) => useDebounce(v, 150), { initialProps: { v: "t" } });
    expect(result.current).toBe("t");
    rerender({ v: "tu" });
    rerender({ v: "tue" });
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe("t");
    act(() => { vi.advanceTimersByTime(60); });
    expect(result.current).toBe("tue");
    vi.useRealTimers();
  });
});
