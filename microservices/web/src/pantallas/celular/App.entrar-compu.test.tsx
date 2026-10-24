/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Quién decide que la computadora entre sola (RF-76): la aplicación del celular. Si llegó por el
// código de una computadora sin sesión y entra ahí, con Google o con la huella, eso fue la
// confirmación y la computadora entra sin otro toque; con la sesión ya abierta, hace falta el
// toque. Se prueba la aplicación entera, con su sesión de verdad; Google, la huella y el servidor
// son de mentira (se dan por buenos: lo que se prueba es Ferrebress). Casos C5 y C6 de
// docs/pruebas-manuales/entrar.md.
// El servidor se simula en fetch, debajo del cliente de la API: así la sesión, que el arreglo
// general de las pruebas ya cargó, usa el mismo servidor de mentira que el resto.
vi.unmock("../../datos/sesion");
const lector = vi.hoisted(() => ({ leer: vi.fn<(...a: any[]) => Promise<any>>() }));
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => true, startRegistration: vi.fn(), startAuthentication: lector.leer }));
// Cada prueba carga la aplicación de cero: la anterior deja trabajo andando (el espejo que se
// reconecta, el control de la sesión) que no tiene que mezclarse con la siguiente.
let App: typeof import("./App")["App"];

const CARLOS = { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", roles: ["Administrador"], permisos: [] };
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const UA = navigator.userAgent;
let avisarAFerrebress: ((r: { credential: string }) => void) | null = null;
type Pedido = [ruta: string, opciones: { body?: string }];
const pedidos: Pedido[] = [];
const aprobaciones = () => pedidos.filter((c) => c[0] === "/sesiones/vinculaciones/aprobar");
function contestar(ruta: string): unknown {
  if (ruta === "/sesiones/google/cliente") return { clienteId: "cliente-de-prueba" };
  if (ruta === "/sesiones/google" || ruta === "/credenciales/login") return { token: "token-nuevo", usuario: CARLOS };
  if (ruta === "/sesiones/actual") return { id: "s-1", usuario: CARLOS };
  if (ruta === "/credenciales/login/opciones") return { desafioId: "d-1", opciones: { challenge: "x" } };
  if (ruta === "/sesiones/vinculaciones/aprobar") return { dispositivo: "computadora · Chrome" };
  if (ruta === "/puestos/mio") return { comoComputadora: null, comoCelular: null };
  return {};
}

beforeEach(async () => {
  vi.resetModules();
  ({ App } = await import("./App"));
  Object.defineProperty(navigator, "userAgent", { value: ANDROID, configurable: true });
  localStorage.clear(); sessionStorage.clear();
  avisarAFerrebress = null;
  window.google = { accounts: { id: { initialize: ({ callback }) => { avisarAFerrebress = callback; }, renderButton: () => undefined } } };
  lector.leer.mockReset(); pedidos.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string, opciones: { body?: string } = {}) => {
    const ruta = new URL(url).pathname;
    pedidos.push([ruta, opciones]);
    return new Response(JSON.stringify(contestar(ruta)), { status: 200, headers: { "Content-Type": "application/json" } });
  }));
  location.hash = "#/entrar-compu?codigo=abc";
});
afterEach(() => { vi.unstubAllGlobals(); Object.defineProperty(navigator, "userAgent", { value: UA, configurable: true }); delete window.google; location.hash = ""; });

describe("el celular que llega por el código de la computadora", () => {
  it("C6: sin sesión, entra con Google y la computadora entra sola, sin otro toque", async () => {
    render(<App />);
    expect(await screen.findByTestId("entrar-para-la-compu")).toBeTruthy();
    await waitFor(() => expect(avisarAFerrebress).not.toBeNull());
    await act(async () => { avisarAFerrebress!({ credential: "credencial-de-google" }); });
    await waitFor(() => expect(aprobaciones()).toHaveLength(1));
    expect(aprobaciones()[0]![1].body).toContain('"codigo":"abc"');
    expect(screen.queryByTestId("dejar-entrar")).toBeNull();
    await waitFor(() => expect(location.hash).toBe("#/catalogo"));
  });

  it("C5: sin sesión, entra con la huella y la computadora entra sola, sin otro toque", async () => {
    lector.leer.mockResolvedValue({ id: "clave-del-celular", response: {} });
    render(<App />);
    fireEvent.click(await screen.findByTestId("entrar-huella"));
    await waitFor(() => expect(aprobaciones()).toHaveLength(1));
    expect(pedidos.map((c) => c[0])).not.toContain("/sesiones/google");
    expect(screen.queryByTestId("dejar-entrar")).toBeNull();
  });

  it("si no llega a entrar (la huella no se leyó), la computadora no entra", async () => {
    lector.leer.mockRejectedValue(Object.assign(new Error("cancelado"), { name: "NotAllowedError" }));
    render(<App />);
    fireEvent.click(await screen.findByTestId("entrar-huella"));
    expect(await screen.findByTestId("error-huella")).toBeTruthy();
    expect(aprobaciones()).toHaveLength(0);
  });

  it("C2: con la sesión ya abierta, abrir el enlace no alcanza: pregunta y espera el toque", async () => {
    localStorage.setItem("ferre.sesion.prueba", "token-guardado");
    render(<App />);
    fireEvent.click(await screen.findByTestId("dejar-entrar"));
    await waitFor(() => expect(aprobaciones()).toHaveLength(1));
  });

  it("con la sesión ya abierta, sin tocar nada, la computadora no entra", async () => {
    localStorage.setItem("ferre.sesion.prueba", "token-guardado");
    render(<App />);
    expect(await screen.findByTestId("dejar-entrar")).toBeTruthy();
    await new Promise((r) => setTimeout(r, 300));
    expect(aprobaciones()).toHaveLength(0);
  });
});
