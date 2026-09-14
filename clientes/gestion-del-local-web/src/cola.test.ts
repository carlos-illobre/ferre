import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorApi } from "./api";

// La cola es write-ahead: se anota antes de mandar, los cambios de un mismo producto se
// funden, todo sale en orden por un solo drenaje, y lo pendiente se aplica sobre el
// catálogo bajado. Es lo que hace que un margen elegido sobreviva a una recarga.
const apiFalsa = vi.fn();
vi.mock("./api", async (original) => ({ ...(await original<typeof import("./api")>()), api: (...args: unknown[]) => apiFalsa(...args) }));

import { abrirBase } from "./almacen";
async function vaciarCola() {
  const db = await abrirBase();
  const tx = db.transaction(["cola", "meta"], "readwrite");
  tx.objectStore("cola").clear(); tx.objectStore("meta").clear();
  await new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
}

describe("cola de cambios", () => {
  beforeEach(async () => { apiFalsa.mockReset(); await vaciarCola(); });

  it("con red manda enseguida y no deja nada en la cola", async () => {
    apiFalsa.mockResolvedValue(undefined);
    const { enviarOEncolar, pendientes } = await import("./cola");
    const r = await enviarOEncolar("producto.cambio", "PATCH", "/productos/p1", { margen_elegido: 100 });
    expect(r.encolado).toBe(false);
    expect(apiFalsa).toHaveBeenCalledWith("/productos/p1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ margen_elegido: 100 }) }));
    expect(await pendientes()).toHaveLength(0);
  });

  it("sin red queda anotado y se reenvía en orden al volver", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const { enviarOEncolar, pendientes, enviarPendientes } = await import("./cola");
    expect((await enviarOEncolar("venta", "POST", "/ventas", { id: "v1" })).encolado).toBe(true);
    expect((await enviarOEncolar("venta", "POST", "/ventas", { id: "v2" })).encolado).toBe(true);
    expect((await pendientes()).map((c) => (c.cuerpo as { id: string }).id)).toEqual(["v1", "v2"]);
    apiFalsa.mockReset(); apiFalsa.mockResolvedValue(undefined);
    expect(await enviarPendientes()).toBe(0);
    const cuerpos = apiFalsa.mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body).id);
    expect(cuerpos).toEqual(["v1", "v2"]);
  });

  it("dos cambios seguidos del mismo producto se funden: nunca se reenvía un margen viejo", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const { enviarOEncolar, pendientes, cambiosDeProductosPendientes } = await import("./cola");
    await enviarOEncolar("producto.cambio", "PATCH", "/productos/p1", { margen_elegido: 100 });
    await enviarOEncolar("producto.cambio", "PATCH", "/productos/p1", { margen_elegido: 50 });
    await enviarOEncolar("producto.cambio", "PATCH", "/productos/p1", { unidad: "kg" });
    const cola = await pendientes();
    expect(cola).toHaveLength(1);
    expect(cola[0]!.cuerpo).toEqual({ margen_elegido: 50, unidad: "kg" });
    expect(Object.fromEntries(await cambiosDeProductosPendientes())).toEqual({ p1: { margen_elegido: 50, unidad: "kg" } });
  });

  it("un rechazo del servidor (4xx) se descarta de la cola y se le avisa a quien lo pidió", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined); // el drenaje lo registra
    apiFalsa.mockRejectedValue(new ErrorApi(400, "El margen es un porcentaje entero"));
    const { enviarOEncolar, pendientes } = await import("./cola");
    await expect(enviarOEncolar("producto.cambio", "PATCH", "/productos/p1", { margen_elegido: 1.5 })).rejects.toThrow("porcentaje entero");
    expect(await pendientes()).toHaveLength(0);
  });

  it("un 401 no se descarta: se reintenta cuando vuelva la sesión", async () => {
    apiFalsa.mockRejectedValue(new ErrorApi(401, "Hay que iniciar sesión"));
    const { enviarOEncolar, pendientes } = await import("./cola");
    expect((await enviarOEncolar("venta", "POST", "/ventas", { id: "v1" })).encolado).toBe(true);
    expect(await pendientes()).toHaveLength(1);
  });

  it("los cambios de productos se mandan con keepalive para sobrevivir a una recarga", async () => {
    apiFalsa.mockResolvedValue(undefined);
    const { enviarOEncolar } = await import("./cola");
    await enviarOEncolar("producto.cambio", "PATCH", "/productos/p1", { margen_elegido: 100 });
    expect((apiFalsa.mock.calls[0]![1] as RequestInit).keepalive).toBe(true);
  });
});
