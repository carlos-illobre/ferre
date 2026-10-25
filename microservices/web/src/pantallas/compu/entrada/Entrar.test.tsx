/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ConRutas } from "../base/rutas";
import { Icono } from "../base/ui";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
// El dibujo del QR es trabajo asíncrono de verdad: con la máquina cargada termina tarde y corre
// el momento en que vence el código. Acá es instantáneo; lo que se prueba es la entrada.
vi.mock("qrcode", () => ({ default: { toDataURL: async (texto: string) => `data:image/png;base64,${btoa(texto)}` } }));
import { Entrar } from "./Entrar";
import { avisos } from "../../../datos/conexion";
import { TEXTOS_DE_ENTRADA } from "../../comun/entrada/textos-de-entrada";

// El servidor contesta (o no): de eso depende «En línea» (decisión 118), que no pregunta nada (RF-143).
// Con el código en pantalla, la computadora espera por el canal (un flujo que queda abierto).
const servidor = vi.hoisted(() => ({ responde: true, canales: [] as ReadableStreamDefaultController<Uint8Array>[], pedidos: [] as string[] }));
const avisar = (texto: string) => servidor.canales.at(-1)!.enqueue(new TextEncoder().encode(`data: ${texto}\n\n`));

// La entrada de la computadora copia la imagen de referencia de Carlos (decisión 93,
// specs/007-usuarios-y-acceso/maquetas/entrar-compu-con-celular.html). En el celular no cambia.
describe("la entrada de la computadora", () => {
  beforeEach(() => {
    apiFalsa.mockReset();
    // Como el cliente de verdad: si el servidor no está, el pedido no llega y la central lo sabe.
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (!servidor.responde) { avisos.fallo(); throw new TypeError("Failed to fetch"); }
      return ruta === "/sesiones/vinculaciones" ? { id: "v1", codigo: "abc", clave: "k", expiraEnSegundos: 300 } : { estado: "pendiente" };
    });
    servidor.responde = true;
    servidor.canales = [];
    servidor.pedidos = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      servidor.pedidos.push(new URL(url).pathname);
      return new Response(new ReadableStream<Uint8Array>({ start: (c) => { servidor.canales.push(c); } }), { status: 200 });
    }));
    // Cada prueba empieza con la red (el indicador es uno solo para toda la aplicación).
    act(() => { window.dispatchEvent(new Event("online")); });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("tiene la marca a la izquierda, el celular con una venta en el medio y la tarjeta para entrar a la derecha", async () => {
    const { container } = render(<Entrar />);
    const entrada = screen.getByTestId("entrar");
    // La marca: antetítulo, título con «de la ferretería.» resaltado, bajada y lo que hace.
    expect(entrada.querySelector(".entrar-cc-antetitulo")?.textContent).toBe("El sistema del mostrador");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Precios al día,ventas y stockde la ferretería.");
    expect(entrada.querySelector("h1 em")?.textContent).toBe("de la ferretería.");
    // Cada una corta en dos renglones, en el mismo lugar que la referencia.
    const renglones = [...entrada.querySelectorAll(".entrar-cc-puntos .texto")].map((t) => t.innerHTML.split("<br>"));
    expect(renglones).toEqual([
      ["Buscás el producto,", "decís el precio y cobrás."],
      ["Los precios se actualizan", "con las listas de los proveedores."],
      ["Lo que se vende baja del stock;", "lo que se compra, sube."],
    ]);
    // Debajo, «Ver tutorial», que por ahora no lleva a ningún lado (la frase manuscrita se sacó).
    expect(screen.getByTestId("ver-tutorial").textContent).toBe("Ver tutorial");
    expect(entrada.querySelector(".entrar-cc-marca [data-testid='ver-tutorial']")).toBeTruthy();
    expect(entrada.querySelector(".entrar-cc-manuscrito")).toBeNull();
    // El medio: la foto del local y el celular con la captura de una venta, que no se leen en voz alta.
    expect(container.querySelector(".entrar-cc-fondo")?.getAttribute("aria-hidden")).toBe("true");
    const celular = container.querySelector(".entrar-cc-celular");
    expect(celular?.getAttribute("aria-hidden")).toBe("true");
    expect(celular?.getAttribute("src")).toMatch(/entrar-celular/);
    // La tarjeta (decisión 118): la pastilla, el título, «Entra con tu usuario…», el código con el
    // isotipo y cuánto falta para que cambie, los dos pasos, Google, quién entra y el pie.
    expect(entrada.querySelector(".entrar-cc-pastilla")?.textContent).toBe(TEXTOS_DE_ENTRADA.masRapida);
    expect(screen.getByRole("heading", { name: TEXTOS_DE_ENTRADA.conElCelular })).toBeTruthy();
    expect(screen.getByText(TEXTOS_DE_ENTRADA.conTuUsuario)).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId("qr-entrar").querySelector("img")).toBeTruthy());
    // El isotipo va encima del código sin ser otra imagen: la única imagen es el código.
    expect(screen.getByTestId("qr-entrar").querySelector(".entrar-qr-isotipo")).toBeTruthy();
    expect(screen.getByTestId("qr-entrar").querySelectorAll("img")).toHaveLength(1);
    expect(screen.getByTestId("entrar-cuenta").textContent).toMatch(/^Cambia en [45]:\d\dy sirve una vez$/);
    expect([...entrada.querySelectorAll(".entrar-pasos b")].map((b) => b.textContent)).toEqual(TEXTOS_DE_ENTRADA.pasos.map((p) => p.titulo));
    expect(entrada.querySelector(".entrar-o")?.textContent).toBe("o");
    // Arriba: esta computadora y el estado de la conexión con el servidor.
    await waitFor(() => expect(screen.getByTestId("entrar-conexion").textContent).toBe("En línea"));
    expect(entrada.querySelector(".entrar-cc-estado")?.textContent).toContain(TEXTOS_DE_ENTRADA.estaComputadora);
    expect(screen.getByText(TEXTOS_DE_ENTRADA.nota)).toBeTruthy();
    expect(screen.getByText(TEXTOS_DE_ENTRADA.protegidos)).toBeTruthy();
    // Sin «¿Necesitás ayuda?»: Carlos lo sacó.
    expect(entrada.textContent).not.toContain("Necesitás ayuda");
  });

  it("C8: el código se renueva solo a los 5 minutos", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    try {
      render(<Entrar />);
      const codigos = () => apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones").length;
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(codigos()).toBe(1);
      await act(async () => { await vi.advanceTimersByTimeAsync(4 * 60_000); });
      expect(codigos()).toBe(1); // mientras vale, se sigue mostrando el mismo
      // 025-E03: mientras tanto no se pregunta nada: un solo canal abierto, ninguna consulta del estado.
      expect(apiFalsa.mock.calls.filter((c) => String(c[0]).endsWith("/estado"))).toHaveLength(0);
      expect(servidor.pedidos).toEqual(["/canal"]);
      await act(async () => { await vi.advanceTimersByTimeAsync(70_000); });
      expect(codigos()).toBe(2);
    } finally { vi.useRealTimers(); }
  });

  it("C10: sin internet no hay código: arriba dice «Sin conexión» y que para entrar hace falta internet", async () => {
    const onLine = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine")!;
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    try {
      act(() => { window.dispatchEvent(new Event("offline")); });
      render(<Entrar />);
      await waitFor(() => expect(screen.getByTestId("entrar-conexion").dataset.estado).toBe("sin-conexion"));
      expect(screen.getByTestId("entrar-conexion").textContent).toBe("Sin conexión");
      expect(screen.getByTestId("entrar-sin-conexion").textContent).toBe(TEXTOS_DE_ENTRADA.sinConexion);
      expect(screen.getByTestId("qr-entrar").className).toContain("apagado");
      expect(screen.getByTestId("qr-entrar").querySelector("img")).toBeNull();
      expect(apiFalsa).not.toHaveBeenCalledWith("/sesiones/vinculaciones", expect.anything());
      // Google y la huella tampoco se pueden usar: quedan apagados y fuera del alcance del teclado.
      expect(screen.getByTestId("entrar-otras").getAttribute("aria-disabled")).toBe("true");
      expect(screen.getByTestId("entrar-otras").hasAttribute("inert")).toBe(true);
      // Cuando vuelve la conexión, aparece el código y Google vuelve.
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
      act(() => { window.dispatchEvent(new Event("online")); });
      await waitFor(() => expect(screen.getByTestId("qr-entrar").querySelector("img")).toBeTruthy());
      expect(screen.getByTestId("entrar-conexion").textContent).toBe("En línea");
      expect(screen.getByTestId("entrar-otras").hasAttribute("inert")).toBe(false);
    } finally { delete (navigator as { onLine?: boolean }).onLine; Object.defineProperty(Navigator.prototype, "onLine", onLine); }
  });

  it("025-E12, 007 escenarios 9 y 11: sin servidor dice «Sin conexión» y no insiste a ritmo fijo; al volver la red pide el código y con el canal abierto dice «En línea»", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    try {
      servidor.responde = false;
      render(<Entrar />);
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(screen.getByTestId("entrar-conexion").textContent).toBe("Sin conexión");
      await act(async () => { await vi.advanceTimersByTimeAsync(10 * 60_000); });
      expect(apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones")).toHaveLength(1);
      servidor.responde = true;
      act(() => { window.dispatchEvent(new Event("online")); });
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      expect(apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones")).toHaveLength(2);
      expect(screen.getByTestId("entrar-conexion").textContent).toBe("En línea");
      expect(screen.getByTestId("qr-entrar").querySelector("img")).toBeTruthy();
    } finally { vi.useRealTimers(); }
  });

  it("025-E12: si el servidor no contesta aunque haya red, el código se vuelve a pedir al tocar la pantalla, no a ritmo fijo", async () => {
    servidor.responde = false;
    render(<Entrar />);
    await waitFor(() => expect(screen.getByTestId("entrar-conexion").textContent).toBe("Sin conexión"));
    servidor.responde = true;
    act(() => { window.dispatchEvent(new Event("pointerdown")); });
    await waitFor(() => expect(screen.getByTestId("qr-entrar").querySelector("img")).toBeTruthy());
    expect(screen.getByTestId("entrar-conexion").textContent).toBe("En línea");
    expect(apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones")).toHaveLength(2);
  });

  it("025-E04: el código vencido y rechazado a la vez pide uno solo nuevo", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    try {
      render(<Entrar />);
      await act(async () => { await vi.advanceTimersByTimeAsync(10); });
      act(() => { servidor.canales.at(-1)!.enqueue(new TextEncoder().encode("")); });
      // Vence, y el servidor rechaza el código viejo al mismo tiempo.
      await act(async () => { await vi.advanceTimersByTimeAsync(300_000); });
      expect(apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones")).toHaveLength(2);
    } finally { vi.useRealTimers(); }
  });

  it("025-E01: cuando el celular aprueba, el servidor avisa por el canal y la computadora retira la sesión una vez", async () => {
    render(<Entrar />);
    await waitFor(() => expect(servidor.canales).toHaveLength(1));
    const fetchFalso = vi.mocked(fetch);
    expect(JSON.parse((fetchFalso.mock.calls[0]![1] as { headers: Record<string, string> }).headers["X-Temas"]!)).toEqual([{ t: "entrada:v1", k: "k" }]);
    act(() => { avisar('{"t":"entrada:v1","d":{"listo":true}}'); });
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/sesiones/vinculaciones/v1/estado", expect.objectContaining({ method: "POST" })));
    expect(apiFalsa.mock.calls.filter((c) => String(c[0]).endsWith("/estado"))).toHaveLength(1);
  });

  it("025-E12: si el canal se corta, dice «Sin conexión» en el momento; el código sigue y vuelve solo", async () => {
    render(<Entrar />);
    await waitFor(() => expect(screen.getByTestId("entrar-conexion").textContent).toBe("En línea"));
    act(() => { servidor.canales[0]!.error(new Error("corte")); });
    await waitFor(() => expect(screen.getByTestId("entrar-conexion").textContent).toBe("Sin conexión"));
    expect(apiFalsa.mock.calls.filter((c) => c[0] === "/sesiones/vinculaciones")).toHaveLength(1);
  });

  it("D4 a D6: si el servidor cerró la sesión (a distancia, vencida o el usuario desactivado), la entrada lo dice", () => {
    window.dispatchEvent(new Event("sesion-cerrada"));
    render(<Entrar />);
    expect(screen.getByTestId("sesion-cerrada").textContent).toContain("Hay que iniciar sesión");
  });

  it("debajo de la tarjeta, las tres características técnicas (decisión 118); el aviso de quién puede entrar lleva un escudo", async () => {
    const { container } = render(<ConRutas><Entrar /></ConRutas>);
    const sellos = within(screen.getByTestId("sellos")).getAllByRole("listitem").map((li) => li.innerHTML.split("</svg>")[1]);
    expect(sellos).toEqual(["<span>Una vez dentro, resiste<br>cortes de internet</span>", "<span>Busca productos<br>por código de barras</span>", "<span>Maneja la computadora<br>desde el celular</span>"]);
    expect(container.querySelector(".entrar-cc-derecha > .entrar-cc-tarjeta + .entrar-cc-sellos")).toBeTruthy();
    const escudo = render(<Icono nombre="escudo" />).container.querySelector("path")?.getAttribute("d");
    expect(container.querySelector(".entrar-nota path")?.getAttribute("d")).toBe(escudo);
  });

  it("012-E01: «Ver tutorial» abre el manual en la misma pestaña", async () => {
    render(<ConRutas><Entrar /></ConRutas>);
    fireEvent.click(screen.getByTestId("ver-tutorial"));
    await waitFor(() => expect(location.hash).toBe("#/manual"));
  });
});
