import { afterEach, describe, expect, it, vi } from "vitest";

// La consulta diaria para que Supabase no pause la base por falta de uso (specs/018, RF-125, E31).
const consulta = vi.hoisted(() => vi.fn(async () => ({ rows: [] })));
vi.mock("pg", async (original) => {
  const pg = await original<typeof import("pg")>();
  class Pool { query = consulta; }
  return { ...pg, default: { ...pg.default, Pool } };
});
const { mantenerLaBaseDespierta, UN_DIA_MS } = await import("./db.js");

describe("la base despierta", () => {
  afterEach(() => { vi.useRealTimers(); consulta.mockClear(); });

  it("018-E31: una consulta por día, y ninguna antes", () => {
    vi.useFakeTimers();
    const parar = mantenerLaBaseDespierta();
    vi.advanceTimersByTime(UN_DIA_MS - 1000);
    expect(consulta).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(consulta).toHaveBeenCalledTimes(1);
    expect(consulta).toHaveBeenCalledWith("SELECT 1");
    vi.advanceTimersByTime(6 * UN_DIA_MS);
    expect(consulta).toHaveBeenCalledTimes(7);
    parar();
  });

  it("si la base no responde, sigue intentando al día siguiente", async () => {
    vi.useFakeTimers();
    consulta.mockRejectedValueOnce(new Error("pausada"));
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const parar = mantenerLaBaseDespierta();
    await vi.advanceTimersByTimeAsync(2 * UN_DIA_MS);
    expect(consulta).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledTimes(1);
    parar(); error.mockRestore();
  });
});
