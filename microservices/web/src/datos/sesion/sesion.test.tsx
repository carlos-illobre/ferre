import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

// La sesión del dispositivo cuando el servidor la da por terminada (RF-70, RF-74): la cerraron a
// distancia, venció o desactivaron al usuario. Para el dispositivo es lo mismo: el servidor
// contesta 401 y la aplicación borra la sesión y vuelve sola a la entrada. Se simula el servidor
// (fetch); la sesión y el cliente son los de verdad. Casos D4 a D6 de docs/pruebas-manuales/entrar.md.
vi.unmock("./index"); // la preparación reemplaza la sesión por su index
const { ProveedorDeSesion, useSesion, CONTROL_DE_SESION_MS } = await import("./sesion");
const { api } = await import("../conexion");
const { agregarALaVenta, ventaActual } = await import("../../negocio/ventas/venta-en-curso");

const CARLOS = { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", roles: [], permisos: [] };
const respuesta = (estado: number, cuerpo: unknown = {}) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
let servidor: (ruta: string) => Promise<Response>;

function Estado() {
  const { sesion } = useSesion();
  return <output data-testid="estado">{sesion.estado === "con-sesion" ? (sesion.sinConexion ? "adentro sin conexión" : "adentro") : sesion.estado}</output>;
}

beforeEach(() => {
  localStorage.setItem("ferre.sesion.prueba", "token-guardado");
  localStorage.setItem("ferre.usuario.prueba", JSON.stringify(CARLOS));
  vi.stubGlobal("fetch", vi.fn((url: string) => servidor(new URL(url).pathname)));
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("el servidor da por terminada la sesión", () => {
  it("D4 y D6: con la aplicación abierta, el próximo pedido rechazado la saca a la entrada y borra la sesión", async () => {
    servidor = async (ruta) => (ruta === "/sesiones/actual" ? respuesta(200, { id: "s-1", usuario: CARLOS }) : respuesta(200, []));
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
    // La cerraron desde otro dispositivo (o desactivaron al usuario): el servidor ya no la acepta.
    servidor = async () => respuesta(401, { error: "Hay que iniciar sesión" });
    await act(async () => { await api("/productos").catch(() => undefined); });
    expect(screen.getByTestId("estado").textContent).toBe("sin-sesion");
    expect(localStorage.getItem("ferre.sesion.prueba")).toBeNull();
  });

  it("D5: sin internet sigue adentro; al volver la conexión y rechazarla el servidor, vuelve a la entrada", async () => {
    servidor = async () => { throw new TypeError("Failed to fetch"); };
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro sin conexión"));
    servidor = async () => respuesta(401, { error: "Hay que iniciar sesión" });
    await act(async () => { await api("/ventas").catch(() => undefined); });
    expect(screen.getByTestId("estado").textContent).toBe("sin-sesion");
    expect(localStorage.getItem("ferre.sesion.prueba")).toBeNull();
  });

  // Decisión 97 (historia 5, escenarios 4 y 4b): no hace falta que el dispositivo pida algo.
  it("escenario 4: con la aplicación abierta y sin tocar nada, en menos de 30 segundos vuelve a la entrada", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      servidor = async () => respuesta(200, { id: "s-1", usuario: CARLOS });
      render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
      await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
      // La desactivaron (o le cerraron la sesión a distancia).
      servidor = async () => respuesta(401, { error: "Hay que iniciar sesión" });
      await act(async () => { await vi.advanceTimersByTimeAsync(CONTROL_DE_SESION_MS); });
      await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("sin-sesion"));
      expect(CONTROL_DE_SESION_MS).toBeLessThanOrEqual(30_000);
      expect(localStorage.getItem("ferre.sesion.prueba")).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("escenario 4: si estaba en otra ventana, sale apenas vuelve a la aplicación", async () => {
    servidor = async () => respuesta(200, { id: "s-1", usuario: CARLOS });
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
    servidor = async () => respuesta(401, { error: "Hay que iniciar sesión" });
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("sin-sesion"));
  });

  it("escenario 4b: sin conexión sigue trabajando; al recuperarla, vuelve a la entrada", async () => {
    servidor = async () => { throw new TypeError("Failed to fetch"); };
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro sin conexión"));
    servidor = async () => respuesta(401, { error: "Hay que iniciar sesión" });
    await act(async () => { window.dispatchEvent(new Event("online")); });
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("sin-sesion"));
  });

  it("D1: con una sesión que vale, al abrir entra directo, sin pedir Google ni la huella", async () => {
    servidor = async () => respuesta(200, { id: "s-1", usuario: CARLOS });
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
  });
});

// La venta a medio armar es de quien la armaba (015, ADR-022): al salir, o al cerrarla el
// servidor, no queda para el que entre después en el mismo dispositivo.
describe("la venta en curso al cerrarse la sesión", () => {
  const MECHA = { id: "mecha", descripcion: "Mecha para madera 6 mm", unidad: "unidad", margen_elegido: 100 } as never;
  function Salir() { const { salir } = useSesion(); return <button type="button" onClick={() => void salir()}>Salir</button>; }

  it("015: «Salir» vacía la venta", async () => {
    servidor = async () => respuesta(200, { id: "s-1", usuario: CARLOS });
    render(<ProveedorDeSesion><Estado /><Salir /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
    act(() => { agregarALaVenta(MECHA); });
    await act(async () => { screen.getByRole("button", { name: "Salir" }).click(); });
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("sin-sesion"));
    expect(ventaActual().items).toHaveLength(0);
  });

  it("015: si el servidor cierra la sesión, la venta se vacía", async () => {
    servidor = async () => respuesta(200, { id: "s-1", usuario: CARLOS });
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
    act(() => { agregarALaVenta(MECHA); });
    servidor = async () => respuesta(401, { error: "Hay que iniciar sesión" });
    await act(async () => { await api("/productos").catch(() => undefined); });
    expect(screen.getByTestId("estado").textContent).toBe("sin-sesion");
    expect(ventaActual().items).toHaveLength(0);
  });
});
