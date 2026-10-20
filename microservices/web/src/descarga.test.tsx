/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

// La descarga a mano para trabajar sin conexión (specs/018, historia 5).
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("./api", async (original) => ({ ...(await original<typeof import("./api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
import { leerMeta, leerTodo, respetarElGuardado } from "./almacen";
import { descargar, loBajado, olvidarLaDescarga, SIN_CONEXION_PARA_BAJAR } from "./descarga";
import { cambiarPreferencia, recargarPreferencias } from "./preferencias";
import { Configuracion } from "./pantallas/Configuracion";

const prod = (id: string, extra: any = {}) => ({ id, descripcion: id.toUpperCase(), marca: null, codigo_barras: null, unidad: "unidad", margen_elegido: null, proveedor: "P", codigo_proveedor: null, costo_neto: "100", iva: "0.21", fecha_lista: "2026-08-11", lista_importada_id: "l", explicacion_costo: [], ...extra });
const pedidos = () => apiFalsa.mock.calls.map((c) => String(c[0]));
const COMPUTADORA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36";

// El servidor de mentira: 3 productos de a 2 la primera vez; con marca, lo que cambió.
function servidor(cambios: { productos: any[]; quitados: string[] } | null = null) {
  apiFalsa.mockImplementation(async (ruta: string) => {
    const q = new URL(ruta, "http://x").searchParams;
    if (ruta === "/productos/resumen") return { productos: 3, sin_margen: 0 };
    if (ruta.startsWith("/productos/descarga")) {
      if (q.get("marca")) return { productos: cambios?.productos ?? [], quitados: cambios?.quitados ?? [], hay_mas: false, siguiente: null, marca: "200" };
      return q.get("desde") ? { productos: [prod("c")], quitados: [], hay_mas: false, siguiente: "c", marca: "101" } : { productos: [prod("a"), prod("b")], quitados: [], hay_mas: true, siguiente: "b", marca: "100" };
    }
    if (ruta.startsWith("/stock/cambios")) return q.get("marca") ? { marca: "210", stock: { b: "9" } } : { marca: "110", stock: { a: "3", b: "1" } };
    if (ruta === "/clientes") return [{ id: "cl", nombre: "Constructora" }];
    throw new Error(`inesperado: ${ruta}`);
  });
}

beforeEach(async () => {
  Object.defineProperty(navigator, "userAgent", { value: COMPUTADORA, configurable: true });
  localStorage.clear(); recargarPreferencias(); olvidarLaDescarga(); apiFalsa.mockReset();
  cambiarPreferencia("sinConexion", false); await respetarElGuardado(); // empieza sin nada guardado
  cambiarPreferencia("sinConexion", true);
});

describe("bajar los datos para trabajar sin conexión", () => {
  it("018-E24: la primera vez baja todo de a páginas, el stock y los clientes, y guarda la marca del servidor", async () => {
    servidor();
    await descargar();
    expect(pedidos()).toEqual(["/productos/resumen", "/productos/descarga?limite=500", "/productos/descarga?limite=500&desde=b", "/stock/cambios", "/clientes"]);
    expect((await leerTodo<{ id: string }>("catalogo")).map((p) => p.id).sort()).toEqual(["a", "b", "c"]);
    expect(await leerMeta("descarga")).toMatchObject({ productos: "100", stock: "110", cuantos: 3 });
    const b = await loBajado();
    expect(b?.stock.get("a")).toBe(3);
    expect(b?.clientes).toHaveLength(1);
  });

  it("018-E25: «Actualizar» trae solo lo que cambió desde la marca anterior y borra lo dado de baja", async () => {
    servidor({ productos: [prod("b", { margen_elegido: 50 }), prod("d")], quitados: ["a"] });
    await descargar();
    apiFalsa.mockClear();
    await descargar();
    expect(pedidos()).toEqual(["/productos/descarga?limite=500&marca=100", "/stock/cambios?marca=110", "/clientes"]);
    const productos = await leerTodo<{ id: string; margen_elegido: number | null }>("catalogo");
    expect(productos.map((p) => p.id).sort()).toEqual(["b", "c", "d"]);
    expect(productos.find((p) => p.id === "b")?.margen_elegido).toBe(50);
    expect(await leerMeta("descarga")).toMatchObject({ productos: "200", stock: "210", cuantos: 3 });
    expect((await loBajado())?.stock.get("b")).toBe(9);
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
