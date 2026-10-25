import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";

// La sesión del dispositivo cuando el servidor la da por terminada (RF-70, RF-74): la cerraron a
// distancia, venció o desactivaron al usuario. Para el dispositivo es lo mismo: el servidor
// contesta 401 y la aplicación borra la sesión y vuelve sola a la entrada. Se simula el servidor
// (fetch); la sesión y el cliente son los de verdad. Casos D4 a D6 de docs/pruebas-manuales/entrar.md.
vi.unmock("./index"); // la preparación reemplaza la sesión por su index
const { ProveedorDeSesion, useSesion } = await import("./sesion");
const { api, avisos } = await import("../conexion");
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

  // Decisión 158 (historia 5, escenario 4): sin timer; nadie pregunta mientras nadie la toca.
  it("escenario 4: con la aplicación abierta y sin tocar nada, no pregunta: no hay timer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let preguntas = 0;
      servidor = async () => { preguntas++; return respuesta(200, { id: "s-1", usuario: CARLOS }); };
      render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
      await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
      const alAbrir = preguntas;
      servidor = async () => { preguntas++; return respuesta(401, { error: "Hay que iniciar sesión" }); };
      await act(async () => { await vi.advanceTimersByTimeAsync(24 * 3_600_000); });
      expect(preguntas).toBe(alAbrir);
      expect(screen.getByTestId("estado").textContent).toBe("adentro");
      expect(vi.getTimerCount()).toBe(0);
    } finally { vi.useRealTimers(); }
  });

  it("025-E08, E10: al volver a la aplicación o al volver la red no pregunta nada: el próximo pedido rechazado la saca", async () => {
    const pedidos: string[] = [];
    servidor = async (ruta) => { pedidos.push(ruta); return respuesta(200, { id: "s-1", usuario: CARLOS }); };
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
    const antes = pedidos.length;
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("online")); });
    expect(pedidos).toHaveLength(antes);
  });

  it("025-E11: si el canal está abierto por otra cosa, el aviso de sesión cerrada la saca en el momento", async () => {
    let flujo: ReadableStreamDefaultController<Uint8Array> | null = null;
    const temas: string[] = [];
    vi.stubGlobal("fetch", vi.fn((url: string, init: RequestInit = {}) => {
      if (new URL(url).pathname !== "/canal") return servidor(new URL(url).pathname);
      temas.push((init.headers as Record<string, string>)["X-Temas"]!);
      return Promise.resolve(new Response(new ReadableStream<Uint8Array>({ start: (c) => { flujo = c; } }), { status: 200 }));
    }));
    servidor = async () => respuesta(200, { id: "s-1", usuario: CARLOS });
    // Otra cosa abre el canal antes de que se sepa la sesión (el vínculo, al cargar): al saberse,
    // el canal se vuelve a abrir con ella.
    const dejar = avisos.vigilar({ tema: "otra", temporaria: true });
    render(<ProveedorDeSesion><Estado /></ProveedorDeSesion>);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro"));
    await waitFor(() => expect(temas.at(-1)).toContain("sesion:s-1"));
    await act(async () => { flujo!.enqueue(new TextEncoder().encode('data: {"t":"sesion:s-1","c":true}\n\n')); });
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("sin-sesion"));
    expect(localStorage.getItem("ferre.sesion.prueba")).toBeNull();
    dejar();
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
