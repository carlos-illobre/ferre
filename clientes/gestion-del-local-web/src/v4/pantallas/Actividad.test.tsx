/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: vi.fn(async () => ({ encolado: false })), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));
// Lo que el dispositivo ya tiene guardado: de ahí salen los nombres de productos y clientes.
vi.mock("../../almacen", () => ({
  leerTodo: async (almacen: string) => (almacen === "catalogo" ? [{ id: "p-1", descripcion: "Clavo punta París", unidad: "kg" }] : almacen === "clientes" ? [{ id: "c-1", nombre: "Constructora Martínez" }] : []),
}));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { Actividad } from "./Actividad";

const hoyA = (h: number, m: number, diasAtras = 0) => { const d = new Date(); d.setDate(d.getDate() - diasAtras); d.setHours(h, m, 0, 0); return d.toISOString(); };
const CARLOS = { email: "carlos@ejemplo.com", nombre: "Carlos" };
const MARTA = { email: "marta@gmail.com", nombre: "Marta" };
const USUARIOS = [
  { id: "u-1", email: CARLOS.email, nombre: "Carlos", activo: true },
  { id: "u-2", email: MARTA.email, nombre: "Marta", activo: true },
  { id: "u-4", email: "ramiro@gmail.com", nombre: "Ramiro", activo: false },
];
const EVENTOS = [
  { id: "e1", tipo: "venta.registrada", fecha: hoyA(10, 32), ...CARLOS, contenido: { id: "v1", total: 25000, medio_pago: "cuenta_corriente", cliente_id: "c-1", items: 2 } },
  { id: "e2", tipo: "venta.anulada", fecha: hoyA(9, 12), ...MARTA, contenido: { id: "v0", motivo: "Se equivocó de mecha" } },
  { id: "e3", tipo: "stock.ajustado", fecha: hoyA(18, 6, 1), ...CARLOS, contenido: { productoId: "p-1", antes: 14.5, despues: 12.5, motivo: "Se mojó una caja" } },
  { id: "e4", tipo: "producto.precio_elegido", fecha: hoyA(12, 10, 1), ...MARTA, contenido: { id: "p-1", margen_elegido: 50 } },
  { id: "e5", tipo: "usuario.modificado", fecha: hoyA(11, 20, 1), ...CARLOS, contenido: { id: "u-4", cambios: { activo: false } } },
  { id: "e6", tipo: "compra.registrada", fecha: hoyA(10, 15, 1), ...MARTA, contenido: { id: "co1", proveedor: "Comodo", fecha: "2026-10-09", comprobante: "A-0003-00018822", total: 84091.2, items: 4, productos_nuevos: 0, costos_actualizados: 2 } },
  { id: "e7", tipo: "sesion.iniciada", fecha: hoyA(8, 35, 1), ...MARTA, contenido: { sesionId: "s", dispositivo: "celular · Safari", medio: "huella" } },
  { id: "e8", tipo: "usuario.creado", fecha: hoyA(8, 0, 1), email: null, nombre: null, contenido: { id: "u-1", email: "carlos@ejemplo.com", rol: "dueño", medio: "comando" } },
];

/** El servidor: de a 10, 28 acciones en total salvo que se diga otra cosa. */
function servidor(total = 28, eventos = EVENTOS) {
  apiFalsa.mockImplementation(async (ruta: string) => {
    if (ruta === "/usuarios") return USUARIOS;
    const pagina = Number(new URL(ruta, "http://x").searchParams.get("pagina"));
    return { eventos: total === 0 ? [] : eventos, total, pagina, por_pagina: 10 };
  });
}
const pedidos = () => apiFalsa.mock.calls.map(([ruta]) => ruta as string).filter((r) => r.startsWith("/auditoria")).map((r) => Object.fromEntries(new URL(r, "http://x").searchParams));
const acciones = async () => (await screen.findAllByTestId("evento")).map((e) => e.textContent);

describe("Quién hizo qué (v4)", () => {
  beforeEach(() => { apiFalsa.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("escribe cada acción en palabras del mostrador, con quién y a qué hora", async () => {
    servidor();
    dibujar(<Actividad />, "actividad");
    await waitFor(async () => expect((await acciones())[0]).toContain("Constructora"));
    expect(await acciones()).toEqual([
      "CACarlos vendió $25.000 en cuenta corriente a Constructora Martínez10:32",
      "MAMarta anuló una venta: Se equivocó de mecha09:12Anulación",
      "CACarlos corrigió el stock de Clavo punta París: de 14,5 a 12,518:06",
      "MAMarta cambió el margen de Clavo punta París: 50 %12:10",
      "CACarlos desactivó a Ramiro11:20",
      "MAMarta recibió mercadería de Comodo por $84.09110:15",
      "MAMarta entró con la huella desde un celular08:35",
      "ELEl sistema autorizó a Carlos08:00",
    ]);
    expect(screen.getByTestId("cuenta").textContent).toBe("28 acciones · página 1 de 3");
    expect(pedidos()).toEqual([{ pagina: "1" }]);
  });

  it("agrupa por día y distingue las anulaciones", async () => {
    servidor();
    dibujar(<Actividad />, "actividad");
    await acciones();
    const dias = within(screen.getByTestId("auditoria")).getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(dias).toHaveLength(2);
    expect(dias[0]).toMatch(/^Hoy, /);
    expect(dias[1]).toMatch(/^Ayer, /);
    const anuladas = document.querySelectorAll(".actividad__accion--anulacion");
    expect(anuladas).toHaveLength(1);
    expect(anuladas[0]!.textContent).toContain("Marta anuló una venta");
  });

  it("el detalle de una acción se abre en una hoja, con sus datos", async () => {
    servidor();
    dibujar(<Actividad />, "actividad");
    await waitFor(async () => expect((await acciones())[2]).toContain("Clavo"));
    fireEvent.click(screen.getAllByTestId("evento")[2]!);
    const hoja = screen.getByTestId("hoja-evento");
    expect(within(hoja).getByRole("heading", { level: 2 }).textContent).toBe("Corrección de stock");
    expect(hoja.textContent).toContain("Carlos corrigió el stock de Clavo punta París: de 14,5 a 12,5");
    expect(hoja.textContent).toMatch(/Ayer, .* · 18:06/);
    const datos = [...hoja.querySelectorAll("dl > div")].map((d) => d.textContent);
    expect(datos).toEqual(["ProductoClavo punta París", "Había anotado14,5 kilos", "Quedó en12,5 kilos", "MotivoSe mojó una caja"]);
  });

  it("filtra por persona, tipo y fechas con lo que la API acepta, y vuelve a la página 1", async () => {
    servidor();
    dibujar(<Actividad />, "actividad?pagina=2");
    await acciones();
    expect(pedidos().at(-1)).toEqual({ pagina: "2" });

    fireEvent.change(screen.getByTestId("filtro-usuario"), { target: { value: "u-2" } });
    await waitFor(() => expect(pedidos().at(-1)).toEqual({ pagina: "1", usuario: "u-2" }));
    fireEvent.change(screen.getByTestId("filtro-tipo"), { target: { value: "venta.anulada" } });
    await waitFor(() => expect(pedidos().at(-1)).toEqual({ pagina: "1", usuario: "u-2", tipo: "venta.anulada" }));
    fireEvent.change(screen.getByTestId("filtro-desde"), { target: { value: "2026-10-08" } });
    fireEvent.change(screen.getByTestId("filtro-hasta"), { target: { value: "2026-10-09" } });
    // El «hasta» incluye ese día: a la API va el comienzo del siguiente.
    await waitFor(() => expect(pedidos().at(-1)).toEqual({ pagina: "1", usuario: "u-2", tipo: "venta.anulada", desde: new Date(2026, 9, 8).toISOString(), hasta: new Date(2026, 9, 10).toISOString() }));
    expect(window.location.hash).toBe("#/actividad?persona=u-2&tipo=venta.anulada&desde=2026-10-08&hasta=2026-10-09");

    await acciones();
    fireEvent.click(screen.getByTestId("quitar-filtros"));
    await waitFor(() => expect(pedidos().at(-1)).toEqual({ pagina: "1" }));
    expect(screen.queryByTestId("quitar-filtros")).toBeNull();
  });

  it("las personas del filtro salen de los usuarios, también las desactivadas", async () => {
    servidor();
    dibujar(<Actividad />, "actividad");
    await acciones();
    await waitFor(() => expect(within(screen.getByTestId("filtro-usuario")).getAllByRole("option").map((o) => o.textContent)).toEqual(["Todas las personas", "Carlos", "Marta", "Ramiro (desactivada)"]));
  });

  it("avanza y retrocede de a 10, conservando los filtros", async () => {
    servidor();
    dibujar(<Actividad />, "actividad?tipo=venta.registrada");
    await acciones();
    expect((screen.getByTestId("anteriores") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("siguientes"));
    await waitFor(() => expect(pedidos().at(-1)).toEqual({ pagina: "2", tipo: "venta.registrada" }));
    await waitFor(() => expect(screen.getByTestId("cuenta").textContent).toBe("28 acciones · página 2 de 3"));
    fireEvent.click(screen.getByTestId("siguientes"));
    await waitFor(() => expect(screen.getByTestId("cuenta").textContent).toBe("28 acciones · página 3 de 3"));
    expect((screen.getByTestId("siguientes") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByTestId("anteriores"));
    await waitFor(() => expect(pedidos().at(-1)).toEqual({ pagina: "2", tipo: "venta.registrada" }));
  });

  it("si no hay nada con esos filtros lo dice y ofrece quitarlos", async () => {
    servidor(0);
    dibujar(<Actividad />, "actividad?persona=u-2&tipo=lista.");
    const vacio = await screen.findByTestId("sin-resultados");
    expect(vacio.textContent).toContain("Nada con esos filtros");
    servidor();
    fireEvent.click(within(vacio).getByText("Quitar filtros"));
    expect(await acciones()).toHaveLength(8);
    expect(window.location.hash).toBe("#/actividad");
  });

  it("si no se puede traer, dice por qué y se reintenta", async () => {
    apiFalsa.mockImplementation(async (ruta: string) => { if (ruta === "/usuarios") return USUARIOS; throw new ErrorApi(403, "Solo puede hacerlo un dueño o un admin"); });
    dibujar(<Actividad />, "actividad");
    const error = await screen.findByTestId("error-de-carga");
    expect(error.textContent).toContain("No se pudo traer quién hizo qué");
    servidor();
    fireEvent.click(within(error).getByTestId("reintentar"));
    expect(await acciones()).toHaveLength(8);
  });

  it("sin conexión dice que hace falta internet, y al volver trae el registro", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    servidor();
    dibujar(<Actividad />, "actividad");
    expect(screen.getByTestId("actividad-sin-conexion").textContent).toContain("«Quién hizo qué» necesita internet");
    expect(screen.queryByTestId("evento")).toBeNull();
    const antes = pedidos().length;
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event("online")); });
    expect(await acciones()).toHaveLength(8);
    expect(pedidos().length).toBeGreaterThan(antes);
  });
});
