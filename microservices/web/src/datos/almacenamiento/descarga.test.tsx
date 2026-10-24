/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

// La descarga a mano para trabajar sin conexión (specs/018, historia 5).
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../conexion", async (original) => ({ ...(await original<typeof import("../conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { ErrorApi } from "../conexion";
import { guardar, leerMeta, leerTodo, respetarElGuardado } from "./almacen";
import { descargar, loBajado, olvidarLaDescarga, SIN_CONEXION_PARA_BAJAR } from "./descarga";
import { cambiarPreferencia, recargarPreferencias } from "./preferencias";
import { Configuracion } from "../../pruebas/configuracion";

const prod = (id: string, extra: any = {}) => ({ id, descripcion: id.toUpperCase(), marca: null, codigo_barras: null, unidad: "unidad", margen_elegido: null, proveedor: "P", codigo_proveedor: null, costo_neto: "100", iva: "0.21", fecha_lista: "2026-08-11", lista_importada_id: "l", explicacion_costo: [], ...extra });
const pedidos = () => apiFalsa.mock.calls.map((c) => String(c[0]));
const COMPUTADORA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

// El servidor de mentira: 3 productos de a 2 la primera vez; con marca, lo que cambió. Las marcas
// dicen de qué base son (022-E23).
const calculo = { version: "1" };
const deLaBase = { id: "base" };
function servidor(cambios: { productos: any[]; quitados: string[] } | null = null) {
  apiFalsa.mockImplementation(async (ruta: string) => {
    const q = new URL(ruta, "http://x").searchParams;
    if (ruta === "/productos/resumen") return { productos: 3, sin_margen: 0 };
    if (ruta.startsWith("/productos/descarga")) {
      const [c, b] = [calculo.version, deLaBase.id];
      if (q.get("marca")) return { productos: cambios?.productos ?? [], quitados: cambios?.quitados ?? [], hay_mas: false, siguiente: null, marca: `${b}.200`, calculo: c };
      return q.get("desde") ? { productos: [prod("c")], quitados: [], hay_mas: false, siguiente: "c", marca: `${b}.101`, calculo: c } : { productos: [prod("a"), prod("b")], quitados: [], hay_mas: true, siguiente: "b", marca: `${b}.100`, calculo: c };
    }
    if (ruta.startsWith("/stock/cambios")) return q.get("marca") ? { marca: `${deLaBase.id}.210`, stock: { b: "9" } } : { marca: `${deLaBase.id}.110`, stock: { a: "3", b: "1" } };
    if (ruta === "/clientes") return [{ id: "cl", nombre: "Constructora" }];
    throw new Error(`inesperado: ${ruta}`);
  });
}

beforeEach(async () => {
  Object.defineProperty(navigator, "userAgent", { value: COMPUTADORA, configurable: true });
  calculo.version = "1"; deLaBase.id = "base"; localStorage.clear(); recargarPreferencias(); olvidarLaDescarga(); apiFalsa.mockReset().mockResolvedValue([]);
  cambiarPreferencia("sinConexion", false); await respetarElGuardado(); // empieza sin nada guardado
  cambiarPreferencia("sinConexion", true);
});

describe("bajar los datos para trabajar sin conexión", () => {
  it("018-E24: la primera vez baja todo de a páginas, el stock y los clientes, y guarda la marca del servidor", async () => {
    servidor();
    await descargar();
    expect(pedidos()).toEqual(["/productos/resumen", "/productos/descarga?limite=500", "/productos/descarga?limite=500&desde=b", "/stock/cambios", "/clientes"]);
    expect((await leerTodo<{ id: string }>("catalogo")).map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(await leerMeta("descarga")).toMatchObject({ productos: "base.100", stock: "base.110", cuantos: 3 });
    const b = await loBajado();
    expect(b?.stock.get("a")).toBe(3);
    expect(b?.clientes).toHaveLength(1);
  });

  it("018-E25: «Actualizar» trae solo lo que cambió desde la marca anterior y borra lo dado de baja", async () => {
    servidor({ productos: [prod("b", { margen_elegido: 50 }), prod("d")], quitados: ["a"] });
    await descargar();
    apiFalsa.mockClear();
    await descargar();
    expect(pedidos()).toEqual(["/productos/descarga?limite=500&marca=base.100", "/stock/cambios?marca=base.110", "/clientes"]);
    const productos = await leerTodo<{ id: string; margen_elegido: number | null }>("catalogo");
    expect(productos.map((p) => p.id).sort()).toEqual(["b", "c", "d"]);
    expect(productos.find((p) => p.id === "b")?.margen_elegido).toBe(50);
    expect(await leerMeta("descarga")).toMatchObject({ productos: "base.200", stock: "base.210", cuantos: 3 });
    expect((await loBajado())?.stock.get("b")).toBe(9);
  });

  it("018-E25: si el servidor cambió la cuenta del precio, «Actualizar» baja todo de nuevo", async () => {
    servidor({ productos: [], quitados: ["a"] });
    await descargar();
    calculo.version = "2";
    apiFalsa.mockClear();
    await descargar();
    expect(pedidos().filter((r) => r.startsWith("/productos/descarga"))).toEqual(["/productos/descarga?limite=500&marca=base.100", "/productos/descarga?limite=500", "/productos/descarga?limite=500&desde=b"]);
    expect((await leerTodo<{ id: string }>("catalogo")).map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(await leerMeta("descarga")).toMatchObject({ productos: "base.100", calculo: "2", cuantos: 3 });
  });

  it("022-E23: si la base es otra, «Actualizar» no usa la marca vieja: baja todo de nuevo, también el stock", async () => {
    servidor({ productos: [], quitados: [] });
    await descargar();
    await guardar("catalogo", prod("de-la-otra-base"));
    deLaBase.id = "nueva";
    apiFalsa.mockClear();
    await descargar();
    expect(pedidos()).toEqual(["/productos/descarga?limite=500&marca=base.100", "/productos/descarga?limite=500", "/productos/descarga?limite=500&desde=b", "/stock/cambios", "/clientes"]);
    expect((await leerTodo<{ id: string }>("catalogo")).map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(await leerMeta("descarga")).toMatchObject({ productos: "nueva.100", stock: "nueva.110" });
  });

  it("018-E28: un error del servidor se muestra tal cual, no como falta de conexión", async () => {
    apiFalsa.mockRejectedValue(new ErrorApi(500, "La base no responde"));
    await descargar();
    render(<Configuracion alCambiarElGuardado={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId("cfg-descarga-error").textContent?.trim()).toBe("La base no responde"));
  });

  it("018-E28: sin conexión lo dice y lo bajado antes sigue", async () => {
    servidor();
    await descargar();
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<Configuracion alCambiarElGuardado={() => undefined} />);
    await waitFor(() => expect(screen.getByTestId("cfg-descargar").textContent).toBe("Actualizar"), { timeout: 5000 });
    await act(async () => { fireEvent.click(screen.getByTestId("cfg-descargar")); });
    await waitFor(() => expect(screen.getByTestId("cfg-descarga-error").textContent?.trim()).toBe(SIN_CONEXION_PARA_BAJAR));
    expect(await leerTodo("catalogo")).toHaveLength(3);
  });
});

describe("qué guarda el dispositivo (RF-84)", () => {
  it("018-E13: sin la descarga a mano no guarda catálogo, stock ni clientes: lo que bajó sola una versión anterior se borra", async () => {
    await guardar("catalogo", prod("viejo"));
    await guardar("stock", { id: "viejo", stock: "4" });
    await guardar("clientes", { id: "cl", nombre: "Constructora" });
    await respetarElGuardado();
    expect(await leerTodo("catalogo")).toEqual([]);
    expect(await leerTodo("stock")).toEqual([]);
    expect(await leerTodo("clientes")).toEqual([]);
    expect(await loBajado()).toBeNull();
  });

  it("018-E13: lo bajado a mano no se borra al abrir la aplicación", async () => {
    servidor();
    await descargar();
    await respetarElGuardado();
    expect(await leerTodo("catalogo")).toHaveLength(3);
  });

  it("018-E29: al apagar «Trabajar sin conexión» se borra lo bajado y deja de usarse", async () => {
    servidor();
    await descargar();
    expect(await loBajado()).not.toBeNull();
    const preguntar = vi.spyOn(window, "confirm").mockReturnValue(true);
    const alCambiar = vi.fn();
    render(<Configuracion alCambiarElGuardado={alCambiar} />);
    fireEvent.click(screen.getByTestId("cfg-sin-conexion"));
    await waitFor(() => expect(alCambiar).toHaveBeenCalledTimes(1));
    expect(preguntar.mock.calls[0]![0]).toContain("también los datos bajados");
    expect(await loBajado()).toBeNull();
    expect(screen.queryByTestId("cfg-descarga")).toBeNull();
    cambiarPreferencia("sinConexion", true);
    expect(await leerMeta("descarga")).toBeUndefined();
    expect(await leerTodo("catalogo")).toEqual([]);
    preguntar.mockRestore();
  });
});

describe("la fila de Configuración", () => {
  it("018-E23: con «Trabajar sin conexión» habilitado está la fila, con «Descargar»; al terminar, cuándo y cuántos, y «Actualizar»", async () => {
    servidor();
    render(<Configuracion alCambiarElGuardado={() => undefined} />);
    await waitFor(() => expect((screen.getByTestId("cfg-descargar") as HTMLButtonElement).disabled).toBe(false));
    expect(screen.getByTestId("cfg-descargar").textContent).toBe("Descargar");
    expect(screen.getByTestId("cfg-descarga").textContent).toContain("Todavía no se bajaron");
    await act(async () => { fireEvent.click(screen.getByTestId("cfg-descargar")); });
    await waitFor(() => expect(screen.getByTestId("cfg-descargar").textContent).toBe("Actualizar"), { timeout: 5000 });
    expect(screen.getByTestId("cfg-descarga").textContent).toMatch(/Bajados el \d\d\/\d\d a las \d\d:\d\d: 3 productos, su stock y los clientes/);
  });

  it("018-E23: con la llave apagada la fila no está", () => {
    cambiarPreferencia("sinConexion", false);
    render(<Configuracion alCambiarElGuardado={() => undefined} />);
    expect(screen.queryByTestId("cfg-descarga")).toBeNull();
  });
});
