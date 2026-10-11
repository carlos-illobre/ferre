/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: vi.fn(async () => ({ encolado: false })), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));
const salir = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../sesion", () => ({ useSesion: () => ({ sesion: { estado: "con-sesion", usuario: { id: "u-1", email: "carlos@ejemplo.com", nombre: "Carlos", rol: "dueño" }, sinConexion: false, sesionId: "s-1" }, salir, entrar: vi.fn() }) }));
const huella = vi.hoisted(() => ({ vincular: vi.fn<(...a: any[]) => Promise<any>>(), quitar: vi.fn<(...a: any[]) => Promise<any>>(async () => undefined) }));
vi.mock("../../credenciales", () => ({ EVENTO_CREDENCIALES: "ferre.credenciales", hayHuella: () => true, vincularEsteDispositivo: (...a: unknown[]) => huella.vincular(...a), quitarCredencial: (...a: unknown[]) => huella.quitar(...a) }));
const dispositivo = vi.hoisted(() => ({ celular: false }));
vi.mock("../dispositivo", () => ({ esCelular: () => dispositivo.celular, describirDispositivo: () => "celular · Chrome" }));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { Usuarios } from "./Usuarios";

const haceUnRato = () => new Date(Date.now() - 12 * 60000).toISOString();

/** `yaRechaza`: lo que el servidor rechaza desde antes de abrir la pantalla («MÉTODO ruta» → error). */
function armar(yaRechaza: Record<string, Error> = {}) {
  let usuarios = [
    { id: "u-1", email: "carlos@ejemplo.com", nombre: "Carlos", rol: "dueño", activo: true },
    { id: "u-2", email: "marta@gmail.com", nombre: "Marta", rol: "admin", activo: true },
    { id: "u-4", email: "ramiro@gmail.com", nombre: "Ramiro", rol: "mostrador", activo: false },
  ];
  let sesiones = [
    { id: "s-2", dispositivo: "celular · Chrome", ultimo_uso_en: haceUnRato(), email: "marta@gmail.com", nombre: "Marta" },
    { id: "s-1", dispositivo: "computadora · Chrome", ultimo_uso_en: new Date().toISOString(), email: "carlos@ejemplo.com", nombre: "Carlos" },
  ];
  const credenciales = [{ id: "c-1", dispositivo: "Motorola del depósito", creada_en: "2026-08-02T14:00:00Z", ultimo_uso_en: null }];
  const rechazos = new Map<string, Error>(Object.entries(yaRechaza));

  apiFalsa.mockImplementation(async (ruta: string, opciones: RequestInit = {}) => {
    const metodo = opciones.method ?? "GET";
    const rechazo = rechazos.get(`${metodo} ${ruta}`);
    if (rechazo) throw rechazo;
    const cuerpo = typeof opciones.body === "string" ? (JSON.parse(opciones.body) as Record<string, unknown>) : {};
    if (metodo === "GET" && ruta === "/usuarios") return usuarios;
    if (metodo === "GET" && ruta === "/sesiones") return sesiones;
    if (metodo === "GET" && ruta === "/credenciales") return credenciales;
    if (metodo === "POST" && ruta === "/usuarios") { usuarios = [...usuarios, { id: "u-9", email: String(cuerpo.email), nombre: String(cuerpo.nombre), rol: String(cuerpo.rol), activo: true }]; return usuarios.at(-1); }
    if (metodo === "PATCH") { usuarios = usuarios.map((u) => (ruta.endsWith(u.id) ? { ...u, ...cuerpo } : u)); return undefined; }
    if (metodo === "DELETE") { sesiones = sesiones.filter((s) => !ruta.endsWith(s.id)); return undefined; }
    return undefined;
  });
  dibujar(<Usuarios />, "usuarios");
  const fila = async (nombre: string) => (await screen.findAllByTestId("usuario-fila")).find((f) => f.textContent?.includes(nombre))!;
  const pedidos = (metodo: string) => apiFalsa.mock.calls.filter(([, o]) => (o as RequestInit | undefined)?.method === metodo).map(([ruta, o]) => [ruta, JSON.parse(String((o as RequestInit).body ?? "null"))]);
  return { rechazos, fila, pedidos };
}

async function abrirAutorizar() {
  fireEvent.click(await screen.findByTestId("autorizar"));
  const hoja = screen.getByTestId("hoja-autorizar");
  const escribir = (nombre: string, correo: string) => {
    fireEvent.change(within(hoja).getByTestId("nombre-usuario"), { target: { value: nombre } });
    fireEvent.change(within(hoja).getByTestId("correo-usuario"), { target: { value: correo } });
  };
  const confirmar = () => fireEvent.click(within(hoja).getByTestId("confirmar-autorizar"));
  return { hoja, escribir, confirmar };
}

describe("Usuarios y sesiones (v4)", () => {
  beforeEach(() => { apiFalsa.mockReset(); salir.mockClear(); huella.vincular.mockReset(); huella.quitar.mockClear(); dispositivo.celular = false; });
  afterEach(() => { vi.restoreAllMocks(); });

  it("lista a las personas con su correo y su estado; la fila propia no tiene acciones", async () => {
    const { fila } = armar();
    const carlos = await fila("Carlos");
    expect(carlos.textContent).toContain("Carlos (vos)");
    expect(carlos.textContent).toContain("carlos@ejemplo.com");
    expect(carlos.textContent).toContain("A vos te cambia otro Administrador");
    expect(within(carlos).queryByRole("button")).toBeNull();
    expect((await fila("Marta")).textContent).toContain("Puede entrar");
    expect(within(await fila("Marta")).getByTestId("desactivar")).toBeTruthy();
    expect((await fila("Ramiro")).textContent).toContain("Desactivada");
    // Los roles de la API no aparecen en pantalla.
    expect(screen.getByTestId("usuarios-y-sesiones").textContent).not.toMatch(/dueño|admin\b|mostrador/);
  });

  it("autorizar a alguien pide nombre y correo, sin elegir rol, y lo da de alta como Administrador", async () => {
    const { pedidos, fila } = armar();
    const { hoja, escribir, confirmar } = await abrirAutorizar();
    expect(within(hoja).queryByRole("combobox")).toBeNull();
    escribir(" Lucía ", " Lucia.F@Gmail.com ");
    confirmar();
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Lucía ya puede entrar"));
    expect(pedidos("POST")).toEqual([["/usuarios", { email: "lucia.f@gmail.com", nombre: "Lucía", rol: "admin" }]]);
    expect(screen.queryByTestId("alta-usuario")).toBeNull();
    expect((await fila("Lucía")).textContent).toContain("lucia.f@gmail.com");
  });

  it("no manda el alta si falta el nombre, el correo está mal escrito o ya está en la lista", async () => {
    const { pedidos } = armar();
    const { hoja, escribir, confirmar } = await abrirAutorizar();
    confirmar();
    expect(hoja.textContent).toContain("Escribí el nombre de la persona.");
    expect(hoja.textContent).toContain("Escribí su correo de Google.");
    escribir("Lucía", "lucia@gmail");
    expect(hoja.textContent).toContain("Ese correo está mal escrito");
    escribir("Lucía", "marta@gmail.com");
    expect(hoja.textContent).toContain("Ese correo ya está autorizado: es el de Marta.");
    escribir("Lucía", "ramiro@gmail.com");
    expect(hoja.textContent).toContain("está en la lista como desactivada");
    confirmar();
    expect(pedidos("POST")).toEqual([]);
  });

  it("si el servidor rechaza el alta, el motivo aparece en la hoja y lo escrito no se pierde", async () => {
    const { rechazos } = armar();
    const { hoja, escribir, confirmar } = await abrirAutorizar();
    rechazos.set("POST /usuarios", new ErrorApi(409, "lucia@gmail.com ya existe"));
    escribir("Lucía", "lucia@gmail.com");
    confirmar();
    await waitFor(() => expect(hoja.textContent).toContain("Ese correo ya está autorizado."));
    rechazos.set("POST /usuarios", new ErrorApi(403, "Solo puede hacerlo un dueño o un admin"));
    confirmar();
    const error = await within(hoja).findByTestId("error-autorizar");
    expect(error.textContent).toContain("Tu cuenta no tiene permiso para hacer este cambio.");
    expect(error.textContent).not.toMatch(/dueño|admin/);
    expect((within(hoja).getByTestId("nombre-usuario") as HTMLInputElement).value).toBe("Lucía");
  });

  it("desactivar y reactivar cambian a la persona y lo avisan", async () => {
    const { fila, pedidos } = armar();
    fireEvent.click(within(await fila("Marta")).getByTestId("desactivar"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Marta ya no puede entrar"));
    expect(screen.getByTestId("mensaje").textContent).toContain("Se le cerraron las sesiones abiertas.");
    await waitFor(async () => expect((await fila("Marta")).textContent).toContain("Desactivada"));
    fireEvent.click(within(await fila("Ramiro")).getByTestId("reactivar"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Ramiro puede entrar de nuevo"));
    expect(pedidos("PATCH")).toEqual([["/usuarios/u-2", { activo: false }], ["/usuarios/u-4", { activo: true }]]);
  });

  it("si el servidor no deja desactivar a alguien, lo dice en su fila", async () => {
    const { fila, rechazos } = armar();
    rechazos.set("PATCH /usuarios/u-2", new ErrorApi(403, "Un admin no puede cambiar a un dueño"));
    fireEvent.click(within(await fila("Marta")).getByTestId("desactivar"));
    const error = await within(await fila("Marta")).findByTestId("error-usuario");
    expect(error.textContent).toContain("No se pudo desactivar a Marta");
    expect(error.textContent).toContain("Tu cuenta no tiene permiso para hacer este cambio.");
    expect((await fila("Marta")).textContent).toContain("Puede entrar");
  });

  it("la sesión propia va primero y distinguida; cerrar la de otro la saca de la lista", async () => {
    const { pedidos } = armar();
    const filas = await screen.findAllByTestId("sesion");
    expect(filas[0]!.textContent).toContain("Esta computadora");
    expect(filas[0]!.textContent).toContain("Carlos · activa ahora");
    expect(filas[0]!.textContent).toContain("Esta sesión");
    expect(filas[1]!.textContent).toContain("Celular");
    expect(filas[1]!.textContent).toContain("Marta · hace 12 min");
    fireEvent.click(within(filas[1]!).getByTestId("cerrar-sesion"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Marta tiene que volver a entrar en «Celular»."));
    expect(screen.getAllByTestId("sesion")).toHaveLength(1);
    expect(pedidos("DELETE").map(([ruta]) => ruta)).toEqual(["/sesiones/s-2"]);
    expect(salir).not.toHaveBeenCalled();
  });

  it("salir de la sesión propia cierra la sesión (y la app vuelve a la entrada)", async () => {
    armar();
    const propia = (await screen.findAllByTestId("sesion"))[0]!;
    fireEvent.click(within(propia).getByText("Salir"));
    expect(salir).toHaveBeenCalledTimes(1);
    expect(apiFalsa.mock.calls.some(([ruta]) => ruta === "/sesiones/s-1")).toBe(false);
  });

  it("si no se puede cerrar una sesión, vuelve a la lista y dice por qué", async () => {
    const { rechazos } = armar();
    rechazos.set("DELETE /sesiones/s-2", new TypeError("Failed to fetch"));
    fireEvent.click(within((await screen.findAllByTestId("sesion"))[1]!).getByTestId("cerrar-sesion"));
    expect((await screen.findByTestId("error-sesion")).textContent).toContain("No se pudo cerrar la sesión de Marta");
    expect(screen.getByTestId("error-sesion").textContent).toContain("Hace falta internet.");
    expect(screen.getAllByTestId("sesion")).toHaveLength(2);
  });

  it("en la computadora los celulares se pueden quitar, pero vincular se hace desde el celular", async () => {
    armar();
    const celular = await screen.findByTestId("celular");
    expect(celular.textContent).toContain("Motorola del depósito");
    expect(celular.textContent).toContain("todavía no se usó");
    expect(screen.queryByTestId("vincular-celular")).toBeNull();
    expect(screen.getByTestId("celulares").textContent).toContain("abrí Ferrebress en ese celular");
    fireEvent.click(within(celular).getByTestId("quitar-celular"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("«Motorola del depósito» ya no entra con la huella"));
    expect(huella.quitar).toHaveBeenCalledWith("c-1");
  });

  it("en el celular, vincular pide un nombre (propone uno) y después la huella", async () => {
    dispositivo.celular = true;
    huella.vincular.mockResolvedValue({ id: "c-9", dispositivo: "Celular del mostrador", creada_en: new Date().toISOString(), ultimo_uso_en: null });
    armar();
    expect((await screen.findAllByTestId("sesion"))[0]!.textContent).toContain("Este celular");
    fireEvent.click(screen.getByTestId("vincular-celular"));
    const hoja = screen.getByTestId("hoja-vincular");
    const nombre = within(hoja).getByTestId("nombre-celular") as HTMLInputElement;
    expect(nombre.value).toBe("Celular de Carlos");
    fireEvent.change(nombre, { target: { value: "" } });
    fireEvent.click(within(hoja).getByTestId("confirmar-vincular"));
    expect(hoja.textContent).toContain("Ponele un nombre para reconocerlo.");
    fireEvent.change(nombre, { target: { value: "Celular del mostrador" } });
    fireEvent.click(within(hoja).getByTestId("confirmar-vincular"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Listo: «Celular del mostrador» entra con la huella"));
    expect(huella.vincular).toHaveBeenCalledWith("Celular del mostrador");
    expect(screen.queryByTestId("nombre-celular")).toBeNull();
  });

  it("si la huella no se lee, el celular no queda vinculado y se puede probar de nuevo", async () => {
    dispositivo.celular = true;
    huella.vincular.mockRejectedValue(Object.assign(new Error("cancelado"), { name: "NotAllowedError" }));
    armar();
    fireEvent.click(await screen.findByTestId("vincular-celular"));
    const hoja = screen.getByTestId("hoja-vincular");
    fireEvent.click(within(hoja).getByTestId("confirmar-vincular"));
    expect((await within(hoja).findByTestId("error-vincular")).textContent).toContain("No se leyó la huella");
    expect(within(hoja).getByTestId("confirmar-vincular")).toBeTruthy();
  });

  it("sin conexión avisa que hace falta internet y no deja cambiar nada", async () => {
    dispositivo.celular = true;
    const { fila } = armar();
    await fila("Marta");
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByTestId("usuarios-sin-conexion").textContent).toContain("Para cambiar usuarios hace falta internet");
    expect((screen.getByTestId("autorizar") as HTMLButtonElement).disabled).toBe(true);
    expect((within(await fila("Marta")).getByTestId("desactivar") as HTMLButtonElement).disabled).toBe(true);
    expect((within(screen.getAllByTestId("sesion")[1]!).getByTestId("cerrar-sesion") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("quitar-celular") as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("vincular-celular") as HTMLButtonElement).disabled).toBe(true);
    act(() => { window.dispatchEvent(new Event("online")); });
  });

  it("si no se pueden traer los usuarios, lo dice y se reintenta", async () => {
    const { rechazos } = armar({ "GET /usuarios": new TypeError("Failed to fetch") });
    const error = await screen.findByTestId("error-de-carga");
    expect(error.textContent).toContain("No se pudieron traer los usuarios");
    expect(error.textContent).toContain("Revisá la conexión y probá de nuevo.");
    rechazos.clear();
    fireEvent.click(within(error).getByTestId("reintentar"));
    expect(await screen.findAllByTestId("usuario-fila")).toHaveLength(3);
  });
});
