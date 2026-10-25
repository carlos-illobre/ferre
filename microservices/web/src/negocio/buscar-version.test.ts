import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, EVENTO_VERSION_DEL_SERVIDOR } from "../datos/conexion";
import { buscarVersionAlPasarAlgo } from "./buscar-version";

// La versión nueva se busca solo cuando pasa algo, nunca con un timer (decisión 157, RF-96).
const contesta = (version: string) => window.dispatchEvent(new CustomEvent(EVENTO_VERSION_DEL_SERVIDOR, { detail: version }));
const aLaVista = (visible: boolean) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (visible ? "visible" : "hidden") });
  document.dispatchEvent(new Event("visibilitychange"));
};

describe("buscar la versión nueva cuando pasa algo", () => {
  let buscar: ReturnType<typeof vi.fn>;
  let dejar: () => void;
  beforeEach(() => { vi.useFakeTimers(); buscar = vi.fn(); dejar = buscarVersionAlPasarAlgo(buscar); });
  afterEach(() => { dejar(); vi.useRealTimers(); vi.restoreAllMocks(); });

  it("009-E20: con la aplicación a la vista y sin que pase nada, no busca nunca: no hay timer", () => {
    vi.advanceTimersByTime(48 * 3_600_000);
    expect(buscar).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("009-E21: busca al volver a la vista (no al ocultarse) y al volver la conexión", () => {
    aLaVista(false);
    expect(buscar).not.toHaveBeenCalled();
    aLaVista(true);
    expect(buscar).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event("online"));
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("009-E22: busca cuando el servidor dice una versión distinta de la anterior, una vez por versión", () => {
    contesta("abc1234");
    contesta("def5678");
    expect(buscar).toHaveBeenCalledTimes(1);
    contesta("def5678");
    expect(buscar).toHaveBeenCalledTimes(1);
    contesta("0a0a0a0");
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it("009-E23: la primera versión y las repetidas no disparan nada; sin red tampoco busca", () => {
    contesta("abc1234");
    contesta("abc1234");
    expect(buscar).not.toHaveBeenCalled();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    contesta("def5678");
    aLaVista(true);
    expect(buscar).not.toHaveBeenCalled();
  });

  it("al dejar de escuchar, no busca más", () => {
    dejar();
    aLaVista(true);
    window.dispatchEvent(new Event("online"));
    contesta("a"); contesta("b");
    expect(buscar).not.toHaveBeenCalled();
  });
});

// Cada respuesta de la API dice su versión en X-Version; el cliente la avisa (009-E22).
describe("la versión que dice el servidor", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("009-E22: cualquier respuesta, también un error, avisa la versión de su cabecera", async () => {
    const vistas: string[] = [];
    const oir = (e: Event) => vistas.push((e as CustomEvent<string>).detail);
    window.addEventListener(EVENTO_VERSION_DEL_SERVIDOR, oir);
    const respuesta = (estado: number, version?: string) => new Response(estado === 204 ? null : "{}", { status: estado, headers: version ? { "X-Version": version } : {} });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(respuesta(204, "abc1234")).mockResolvedValueOnce(respuesta(500, "def5678")).mockResolvedValueOnce(respuesta(204)));
    await api("/algo");
    await api("/algo").catch(() => undefined);
    await api("/algo");
    window.removeEventListener(EVENTO_VERSION_DEL_SERVIDOR, oir);
    expect(vistas).toEqual(["abc1234", "def5678"]);
  });
});
