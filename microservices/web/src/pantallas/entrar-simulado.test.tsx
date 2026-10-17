/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

// Entrar con Google y con la huella (RF-70, RF-70b), con lo que no se puede automatizar simulado:
// el botón de Google (window.google, que dibuja Google), la huella del teléfono (la biblioteca de
// passkeys, que habla con el lector) y el servidor (api). Se prueba qué hace Ferrebress con lo
// que devuelven. Casos de docs/pruebas-manuales/entrar.md.
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../api", async (original) => ({ ...(await original<typeof import("../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
const lector = vi.hoisted(() => ({ registrar: vi.fn<(...a: any[]) => Promise<any>>(), leer: vi.fn<(...a: any[]) => Promise<any>>() }));
// La sesión de verdad: el arreglo general de las pruebas la reemplaza por una de prueba.
vi.unmock("../sesion");
vi.mock("@simplewebauthn/browser", () => ({ browserSupportsWebAuthn: () => true, startRegistration: lector.registrar, startAuthentication: lector.leer }));

const { ErrorApi } = await import("../api");
const { ProveedorDeSesion, useSesion } = await import("../sesion");
const compu = await import("./compu/base/pantallas/Entrar");
const OfrecerEnLaCompu = (await import("./compu/base/pantallas/OfrecerHuella")).OfrecerHuella;
const celular = await import("./celular/pantallas/Login");
const OfrecerEnElCelular = (await import("./celular/componentes/OfrecerHuella")).OfrecerHuella;

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36";
const COMPU = navigator.userAgent;
const comoTelefono = (ua: string) => Object.defineProperty(navigator, "userAgent", { value: ua, configurable: true });
const CARLOS = { id: "u-1", email: "carlos@ferre.test", nombre: "Carlos", roles: ["Administrador"], permisos: [] };

// Google de mentira: guarda a quién avisar y dibuja un botón; `elegirCuenta` hace lo que haría
// la persona en la ventana de Google.
let avisarAFerrebress: ((r: { credential: string }) => void) | null = null;
const elegirCuenta = async (credencial: string) => { await waitFor(() => expect(avisarAFerrebress).not.toBeNull()); await act(async () => { avisarAFerrebress!({ credential: credencial }); }); };

function Estado() {
  const { sesion } = useSesion();
  return <output data-testid="estado">{sesion.estado === "con-sesion" ? `adentro como ${sesion.usuario.nombre}` : sesion.estado}</output>;
}
const conSesion = (hijos: React.ReactNode) => render(<ProveedorDeSesion>{hijos}<Estado /></ProveedorDeSesion>);

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); comoTelefono(COMPU);
  avisarAFerrebress = null;
  window.google = { accounts: { id: {
    initialize: ({ callback }) => { avisarAFerrebress = callback; },
    renderButton: (el) => { el.innerHTML = "<button>Continuar con Google</button>"; },
  } } };
  apiFalsa.mockReset(); lector.registrar.mockReset(); lector.leer.mockReset();
  apiFalsa.mockImplementation(async (ruta: string) => {
    if (ruta === "/sesiones/google/cliente") return { clienteId: "cliente-de-prueba" };
    if (ruta === "/sesiones/google" || ruta === "/credenciales/login") return { token: "token-nuevo", usuario: CARLOS };
    if (ruta === "/sesiones/actual") return { id: "s-1", usuario: CARLOS };
    if (ruta.endsWith("/opciones")) return { desafioId: "d-1", opciones: { challenge: "x" } };
    if (ruta === "/credenciales/registro") return { id: "c-1", dispositivo: "celular · Chrome" };
    return {};
  });
});
afterEach(() => { cleanup(); comoTelefono(COMPU); delete window.google; });

describe("entrar con Google (simulado)", () => {
  it("A2: en la computadora, la cuenta que confirma Google entra y la sesión queda guardada en el dispositivo", async () => {
    conSesion(<compu.BotonGoogle />);
    await elegirCuenta("credencial-de-google");
    expect(apiFalsa.mock.calls.find((c) => c[0] === "/sesiones/google")?.[1].body).toContain("credencial-de-google");
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro como Carlos"));
    expect(localStorage.getItem("ferre.sesion")).toBe("token-nuevo");
  });

  it("A5: en la computadora, un correo no autorizado no entra y la pantalla dice cuál y a quién pedirle el alta", async () => {
    apiFalsa.mockRejectedValueOnce(new ErrorApi(403, "extrano@gmail.com no está autorizado. Pedile a quien administra los usuarios que te dé de alta."));
    conSesion(<compu.BotonGoogle />);
    await elegirCuenta("credencial-de-google");
    const error = await screen.findByTestId("error-google");
    expect(error.textContent).toContain("No autorizado");
    expect(error.textContent).toContain("extrano@gmail.com no está autorizado para entrar a Ferrebress");
    expect(error.textContent).toContain("Más → Usuarios");
    expect(screen.getByTestId("estado").textContent).toBe("sin-sesion");
    expect(localStorage.getItem("ferre.sesion")).toBeNull();
  });

  it("007-T030: en la computadora, después de un correo no autorizado el botón de Google se vuelve a dibujar, sin el foco", async () => {
    const dibujar = vi.fn((el: HTMLElement, _opciones?: unknown) => { el.innerHTML = "<button>Continuar con Google</button>"; });
    window.google!.accounts.id.renderButton = dibujar as never;
    apiFalsa.mockRejectedValueOnce(new ErrorApi(403, "extrano@gmail.com no está autorizado."));
    conSesion(<compu.BotonGoogle />);
    await waitFor(() => expect(dibujar).toHaveBeenCalledTimes(1));
    screen.getByRole("button", { name: "Continuar con Google" }).focus();
    await elegirCuenta("credencial-de-google");
    await screen.findByTestId("error-google");
    expect(dibujar).toHaveBeenCalledTimes(2);
    expect(dibujar.mock.calls[1]![1]).toMatchObject({ theme: "filled_blue" });
    expect(document.activeElement).toBe(document.body);
    expect(screen.getAllByRole("button", { name: "Continuar con Google" })).toHaveLength(1);
  });

  it("A4: en la computadora, después de Google no se ofrece la huella", async () => {
    conSesion(<compu.BotonGoogle />);
    await elegirCuenta("credencial-de-google");
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro como Carlos"));
    render(<OfrecerEnLaCompu />);
    expect(screen.queryByTestId("ofrecer-huella")).toBeNull();
  });

  it("A2 y A3: en el celular, la cuenta de Google entra y después se ofrece la huella", async () => {
    comoTelefono(ANDROID);
    conSesion(<celular.BotonGoogle />);
    await elegirCuenta("credencial-de-google");
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro como Carlos"));
    render(<OfrecerEnElCelular />);
    expect(screen.getByTestId("ofrecer-huella").textContent).toContain("¿Entrar con la huella?");
  });

  it("A5: en el celular, un correo no autorizado no entra y lo dice", async () => {
    comoTelefono(ANDROID);
    apiFalsa.mockRejectedValueOnce(new ErrorApi(403, "extrano@gmail.com no está autorizado. Pedile a quien administra los usuarios que te dé de alta."));
    conSesion(<celular.BotonGoogle />);
    await elegirCuenta("credencial-de-google");
    expect((await screen.findByTestId("error-google")).textContent).toContain("extrano@gmail.com no está autorizado");
    expect(screen.getByTestId("estado").textContent).toBe("sin-sesion");
  });
});

describe("la huella (simulada)", () => {
  // Recién entrado con Google en un celular: es cuando se ofrece.
  beforeEach(() => { comoTelefono(ANDROID); sessionStorage.setItem("ferre.recien-google", "1"); });

  it("B1: aceptar y apoyar el dedo vincula el celular y no se vuelve a ofrecer", async () => {
    lector.registrar.mockResolvedValue({ id: "clave-del-celular", response: {} });
    render(<OfrecerEnElCelular />);
    fireEvent.click(screen.getByTestId("aceptar-huella"));
    await waitFor(() => expect(screen.getByTestId("ofrecer-huella").textContent).toContain("Listo"));
    expect(lector.registrar).toHaveBeenCalledTimes(1);
    expect(apiFalsa.mock.calls.map((c) => c[0])).toEqual(["/credenciales/registro/opciones", "/credenciales/registro"]);
    expect(localStorage.getItem("ferre.huella-en-este-dispositivo")).toBe("1");
    cleanup();
    sessionStorage.setItem("ferre.recien-google", "1"); // otra vez con Google en el mismo celular
    render(<OfrecerEnElCelular />);
    expect(screen.queryByTestId("ofrecer-huella")).toBeNull();
  });

  it("B3: si no se lee el dedo, avisa que se vincula después y dónde, y esa vez no cuenta como ofrecida", async () => {
    lector.registrar.mockRejectedValue(Object.assign(new Error("cancelado"), { name: "NotAllowedError" }));
    render(<OfrecerEnElCelular />);
    fireEvent.click(screen.getByTestId("aceptar-huella"));
    expect(await screen.findByText("No se leyó la huella. Podés vincularlo después desde Más → Configuración.")).toBeTruthy();
    expect(apiFalsa.mock.calls.map((c) => c[0])).not.toContain("/credenciales/registro");
    expect(localStorage.getItem("ferre.huella-ofrecida")).toBeNull();
  });

  it("B4: con el celular vinculado, «Entrar con la huella» entra sin Google", async () => {
    lector.leer.mockResolvedValue({ id: "clave-del-celular", response: {} });
    conSesion(<celular.BotonHuella />);
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("sin-sesion"));
    fireEvent.click(screen.getByTestId("entrar-huella"));
    await waitFor(() => expect(screen.getByTestId("estado").textContent).toBe("adentro como Carlos"));
    expect(apiFalsa.mock.calls.map((c) => c[0])).not.toContain("/sesiones/google");
    expect(apiFalsa.mock.calls.find((c) => c[0] === "/credenciales/login")?.[1].body).toContain("clave-del-celular");
  });

  it("B5: un celular que ya no está vinculado no entra y dice que entre con Google", async () => {
    lector.leer.mockResolvedValue({ id: "clave-quitada", response: {} });
    apiFalsa.mockImplementation(async (ruta: string) => {
      if (ruta === "/credenciales/login") throw new ErrorApi(401, "Este celular no está vinculado a ninguna cuenta. Entrá con Google y vinculalo desde Más → Configuración.");
      return { desafioId: "d-1", opciones: {} };
    });
    conSesion(<celular.BotonHuella />);
    fireEvent.click(screen.getByTestId("entrar-huella"));
    expect((await screen.findByTestId("error-huella")).textContent).toContain("Entrá con Google");
    expect(screen.getByTestId("estado").textContent).toBe("sin-sesion");
  });
});
