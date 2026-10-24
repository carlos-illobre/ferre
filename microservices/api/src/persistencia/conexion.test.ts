import { sql } from "kysely";
import pg from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { base, baseResponde, escuchar, esperarLaBase } from "./conexion.js";
import * as conexiones from "./pool.js";

// 022-E05: la salud sabe si la base responde; el arranque espera a la base.
describe("la conexión", () => {
  afterEach(() => vi.restoreAllMocks());

  it("022-E05: dice si la base responde", async () => {
    expect(await baseResponde()).toBe(true);
    vi.spyOn(conexiones.pool, "connect").mockRejectedValueOnce(new Error("sin base") as never);
    expect(await baseResponde()).toBe(false);
  });

  it("espera a la base con reintentos, y pasados los intentos es un error", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const conectar = vi.spyOn(conexiones.pool, "connect");
    conectar.mockRejectedValueOnce(new Error("todavía no") as never);
    await esperarLaBase(3, 1);
    expect(conectar).toHaveBeenCalledTimes(2);
    conectar.mockRejectedValue(new Error("nunca") as never);
    await expect(esperarLaBase(2, 1)).rejects.toThrow("La base no respondió en 2 intentos");
  });

  it("escucha los avisos de un canal: avisa al conectarse y con cada aviso", async () => {
    const avisos = vi.fn();
    const dejar = escuchar("prueba", avisos);
    await vi.waitFor(() => expect(avisos).toHaveBeenCalledTimes(1));
    await sql`SELECT pg_notify('prueba', 'x')`.execute(base);
    await vi.waitFor(() => expect(avisos).toHaveBeenCalledTimes(2));
    dejar();
  });

  it("si se corta la conexión, se reconecta y vuelve a avisar", async () => {
    const avisos = vi.fn();
    const dejar = escuchar("cortada", avisos, 10);
    await vi.waitFor(() => expect(avisos).toHaveBeenCalledTimes(1));
    await sql`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query = 'LISTEN cortada'`.execute(base);
    await vi.waitFor(() => expect(avisos).toHaveBeenCalledTimes(2), { timeout: 5000 });
    dejar();
  });

  it("si no puede escuchar, reintenta hasta que se lo deja", async () => {
    const avisos = vi.fn();
    const dejar = escuchar("no es un canal", avisos, 5);
    await new Promise((listo) => setTimeout(listo, 50));
    dejar();
    expect(avisos).not.toHaveBeenCalled();
  });

  it("dejar de escuchar mientras se conecta no reconecta, y un error que llega tarde no tumba el proceso", async () => {
    let rechazar: (e: Error) => void = () => undefined;
    let cliente: pg.Client | undefined;
    const conectar = vi.spyOn(pg.Client.prototype, "connect").mockImplementationOnce(function (this: pg.Client) {
      cliente = this;
      return new Promise<void>((_, r) => { rechazar = r; });
    } as never);
    const avisos = vi.fn();
    escuchar("apurada", avisos, 1)();
    rechazar(new Error("se cortó"));
    await new Promise((listo) => setTimeout(listo, 20));
    expect(conectar).toHaveBeenCalledTimes(1);
    expect(() => cliente!.emit("error", new Error("tarde"))).not.toThrow();
    expect(avisos).not.toHaveBeenCalled();
  });
});
