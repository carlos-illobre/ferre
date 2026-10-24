import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorApi } from "../conexion";

// La cola es write-ahead: se anota antes de mandar, los cambios de un mismo producto se
// funden, todo sale en orden por un solo drenaje, y lo pendiente se aplica sobre el
// catálogo bajado. Es lo que hace que un margen elegido sobreviva a una recarga.
const apiFalsa = vi.fn();
vi.mock("../conexion", async (original) => ({ ...(await original<typeof import("../conexion")>()), api: (...args: unknown[]) => apiFalsa(...args) }));

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

  it("018-E09: sin red queda anotado y se reenvía en orden al volver", async () => {
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

  // Decisión 97 (007, historia 5, escenario 4d).
  it("lo que dejó sin mandar una persona no sale con la sesión de otra que entra después; sale si vuelve ella", async () => {
    const quien = (u: string) => localStorage.setItem("ferre.usuario.prueba", JSON.stringify({ id: u, email: `${u}@ferre.test`, nombre: u }));
    quien("ana");
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const { enviarOEncolar, pendientes, apartados, enviarPendientes } = await import("./cola");
    await enviarOEncolar("venta", "POST", "/ventas", { id: "de-ana" });
    // A Ana la desactivan y entra Beto en el mismo dispositivo, ya con conexión.
    quien("beto");
    apiFalsa.mockReset(); apiFalsa.mockResolvedValue(undefined);
    expect(await pendientes()).toHaveLength(0);
    expect((await apartados()).map((c) => c.autor)).toEqual(["ana"]);
    await enviarOEncolar("venta", "POST", "/ventas", { id: "de-beto" });
    await enviarPendientes();
    expect(apiFalsa.mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body).id)).toEqual(["de-beto"]);
    expect((await apartados()).map((c) => (c.cuerpo as { id: string }).id)).toEqual(["de-ana"]);
    // Ana vuelve a entrar (la reactivaron): lo suyo sale con su sesión.
    quien("ana");
    apiFalsa.mockClear();
    expect(await enviarPendientes()).toBe(0);
    expect(apiFalsa.mock.calls.map((c) => JSON.parse((c[1] as { body: string }).body).id)).toEqual(["de-ana"]);
    expect(await apartados()).toHaveLength(0);
    localStorage.removeItem("ferre.usuario.prueba");
  });

  // 014: lo que dejó sin mandar alguien a quien desactivaron sube apartado, con el token de su sesión cerrada.
  it("014-E01 014-E03 al cerrarse la sesión, lo de esa persona sube a /apartados y sale del dispositivo; si sigue activa (409), queda", async () => {
    localStorage.setItem("ferre.usuario.prueba", JSON.stringify({ id: "ana", email: "ana@ferre.test", nombre: "Ana" }));
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const { enviarOEncolar, pendientes, apartarLoDeQuienSalio } = await import("./cola");
    const { EVENTO_SESION_CERRADA } = await import("../conexion");
    await enviarOEncolar("venta", "POST", "/ventas", { id: "de-ana" });
    const subidas: { url: string; init: RequestInit }[] = [];
    let respuesta = 409;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => { subidas.push({ url, init }); return new Response(JSON.stringify({}), { status: respuesta }); }));
    try {
      // Sigue activa: no se aparta, queda para cuando vuelva a entrar.
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_CERRADA, { detail: { token: "token-de-ana" } }));
      await vi.waitFor(() => expect(subidas).toHaveLength(1));
      await apartarLoDeQuienSalio();
      expect(subidas).toHaveLength(1);
      expect(await pendientes()).toHaveLength(1);
      // Desactivada: sube con el token de la sesión cerrada y sale del dispositivo.
      respuesta = 200;
      window.dispatchEvent(new CustomEvent(EVENTO_SESION_CERRADA, { detail: { token: "token-de-ana" } }));
      await vi.waitFor(() => expect(subidas).toHaveLength(2));
      const { url, init } = subidas[1]!;
      expect(url).toMatch(/\/apartados$/);
      expect(new Headers(init.headers).get("Authorization")).toBe("Bearer token-de-ana");
      const cuerpo = JSON.parse(String(init.body)) as { cambios: { tipo: string; ruta: string; cuerpo: { id: string } }[] };
      expect(cuerpo.cambios.map((c) => [c.tipo, c.ruta, c.cuerpo.id])).toEqual([["venta", "/ventas", "de-ana"]]);
      await vi.waitFor(async () => expect(await pendientes()).toHaveLength(0));
      expect(localStorage.getItem("ferre.para-apartar.prueba")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      localStorage.removeItem("ferre.usuario.prueba");
    }
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
