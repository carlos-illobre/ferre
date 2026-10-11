/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: vi.fn(async () => ({ encolado: false })), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { DURACION_DEL_AVISO } from "../piezas";
import { dibujar } from "../pruebas";
import { Duplicados, reiniciarDuplicados } from "./Duplicados";

const resumen = (id: string, descripcion: string, proveedor: string, costo: string | null, codigo: string | null = null) => ({ id, descripcion, marca: "Bosch", codigo_barras: codigo, proveedor, costo_neto: costo, fecha_lista: "2026-09-01" });
const SUGERENCIAS = () => [
  { id: "s1", motivo: "codigo_barras", creado_en: "2026-10-01", a: resumen("a1", "Mecha madera Bosch 6mm", "Comodo", "1649.14", "7790001000015"), b: resumen("b1", "Mecha 6 mm madera", "Tresge", "1764.5", "7790001000015") },
  { id: "s2", motivo: "descripcion", creado_en: "2026-10-01", a: resumen("a2", "Cinta aisladora 20 m", "Ixnova", "780.5"), b: resumen("b2", "Cinta aisl. 20mts", "Comodo", null) },
];
const UNIDOS = () => [{ absorbido_id: "x2", absorbido: "Taladro a batería 18V", conservado_id: "x1", conservado: "Taladro inalámbrico 18 V", unido_en: "2026-10-02T10:00:00Z", proveedores: "Erpa, Ixnova" }];

function armar({ sugerencias = SUGERENCIAS(), unidos = UNIDOS() } = {}) {
  catalogo.actual = catalogoFalso([producto({ id: "p1", descripcion: "LLAVE DUPLICADA UNO" }), producto({ id: "p2", descripcion: "LLAVE DUPLICADA DOS" })]);
  apiFalsa.mockImplementation(async (ruta: string) => {
    if (ruta === "/equivalencias") return sugerencias;
    if (ruta === "/equivalencias/unidos") return unidos;
    if (ruta === "/equivalencias/buscar") return { nuevas: 2 };
    return { ok: true };
  });
  const vista = dibujar(<Duplicados />, "duplicados");
  const pedido = (ruta: string) => apiFalsa.mock.calls.find((c) => c[0] === ruta);
  const cuerpo = (ruta: string) => JSON.parse(pedido(ruta)![1].body as string);
  return { vista, pedido, cuerpo };
}

describe("Duplicados (v4)", () => {
  beforeEach(() => { reiniciarDuplicados(); apiFalsa.mockReset(); });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it("cada sugerencia dice por qué se sugiere y muestra los dos productos con proveedor y costo", async () => {
    armar();
    const sugerencias = await screen.findAllByTestId("sugerencia");
    expect(sugerencias).toHaveLength(2);
    expect(screen.getByTestId("duplicados").textContent).toContain("2 para revisar");
    expect(sugerencias[0]!.textContent).toContain("Mismo código de barras");
    expect(sugerencias[0]!.textContent).toContain("7790001000015");
    expect(sugerencias[1]!.textContent).toContain("Descripción muy parecida");
    expect(within(sugerencias[0]!).getByTestId("conservar-a").textContent).toContain("Comodo");
    expect(within(sugerencias[0]!).getByTestId("conservar-a").textContent).toContain("$1.649,14");
    expect(within(sugerencias[0]!).getByTestId("conservar-a").textContent).toContain("Queda este nombre");
    expect(within(sugerencias[1]!).getByTestId("conservar-b").textContent).toContain("Sin costo");
  });

  it("«Es el mismo» une conservando el nombre elegido, y se puede deshacer", async () => {
    const { cuerpo } = armar();
    const [primera] = await screen.findAllByTestId("sugerencia");
    fireEvent.click(within(primera!).getByTestId("conservar-b"));
    expect(within(primera!).getByTestId("conservar-b").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(primera!).getByTestId("unir"));
    const mensaje = await screen.findByTestId("mensaje");
    expect(cuerpo("/equivalencias/s1/unir")).toEqual({ conservar: "b" });
    expect(mensaje.textContent).toContain("Quedó «Mecha 6 mm madera»");
    expect(screen.getAllByTestId("sugerencia")).toHaveLength(1);
    fireEvent.click(within(mensaje).getByText("Deshacer"));
    // Deshacer separa al que quedó absorbido (el del otro lado).
    await waitFor(() => expect(cuerpo("/equivalencias/separar")).toEqual({ absorbido_id: "a1" }));
    expect((await screen.findByTestId("mensaje")).textContent).toContain("Unión deshecha");
  });

  it("«Son distintos» se puede deshacer mientras dura el aviso; después se manda", async () => {
    const { pedido } = armar();
    await screen.findAllByTestId("sugerencia");
    vi.useFakeTimers();
    fireEvent.click(within(screen.getAllByTestId("sugerencia")[1]!).getByTestId("rechazar"));
    expect(screen.getAllByTestId("sugerencia")).toHaveLength(1);
    fireEvent.click(within(screen.getByTestId("mensaje")).getByText("Deshacer"));
    expect(screen.getAllByTestId("sugerencia")).toHaveLength(2);
    act(() => { vi.advanceTimersByTime(DURACION_DEL_AVISO + 100); });
    expect(pedido("/equivalencias/s2/rechazar")).toBeUndefined();
    fireEvent.click(within(screen.getAllByTestId("sugerencia")[1]!).getByTestId("rechazar"));
    expect(screen.getByTestId("mensaje").textContent).toContain("Anotado: son distintos");
    act(() => { vi.advanceTimersByTime(DURACION_DEL_AVISO + 100); });
    expect(pedido("/equivalencias/s2/rechazar")![1].method).toBe("POST");
  });

  it("los ya unidos se separan, y la separación se puede volver atrás", async () => {
    const { cuerpo } = armar();
    const union = await screen.findByTestId("union");
    expect(union.textContent).toContain("Taladro inalámbrico 18 V");
    expect(union.textContent).toContain("También figura como «Taladro a batería 18V» · Erpa y Ixnova");
    fireEvent.click(within(union).getByTestId("separar"));
    const mensaje = await screen.findByTestId("mensaje");
    expect(cuerpo("/equivalencias/separar")).toEqual({ absorbido_id: "x2" });
    expect(mensaje.textContent).toContain("Separados: vuelven a ser dos productos");
    fireEvent.click(within(mensaje).getByText("Volver a unir"));
    await waitFor(() => expect(cuerpo("/equivalencias/unir")).toEqual({ conservar_id: "x1", absorber_id: "x2" }));
  });

  it("unir dos a mano pide dos productos distintos del catálogo", async () => {
    const { cuerpo, pedido } = armar();
    await screen.findAllByTestId("sugerencia");
    fireEvent.click(screen.getByTestId("abrir-union-manual"));
    fireEvent.click(screen.getByTestId("unir-manual"));
    expect(screen.getByTestId("falta-elegir").textContent).toContain("Elegí los dos productos");
    fireEvent.change(screen.getByTestId("buscar-conservar"), { target: { value: "llave duplicada uno" } });
    fireEvent.click(screen.getAllByTestId("opcion-conservar")[0]!);
    fireEvent.change(screen.getByTestId("buscar-absorber"), { target: { value: "llave duplicada uno" } });
    fireEvent.click(screen.getAllByTestId("opcion-absorber")[0]!);
    fireEvent.click(screen.getByTestId("unir-manual"));
    expect(screen.getByTestId("falta-elegir").textContent).toContain("elegí dos distintos");
    expect(pedido("/equivalencias/unir")).toBeUndefined();
    fireEvent.click(within(screen.getByTestId("elegido-absorber")).getByText("Cambiar"));
    fireEvent.change(screen.getByTestId("buscar-absorber"), { target: { value: "llave duplicada dos" } });
    fireEvent.click(screen.getAllByTestId("opcion-absorber")[0]!);
    fireEvent.click(screen.getByTestId("unir-manual"));
    await waitFor(() => expect(cuerpo("/equivalencias/unir")).toEqual({ conservar_id: "p1", absorber_id: "p2" }));
    expect((await screen.findByTestId("mensaje")).textContent).toContain("Quedó «LLAVE DUPLICADA UNO»");
    expect(screen.queryByTestId("unir-manual")).toBeNull();
  });

  it("sin sugerencias lo dice, y se puede buscar duplicados en todo el catálogo", async () => {
    const { pedido } = armar({ sugerencias: [], unidos: [] });
    expect((await screen.findByTestId("sin-duplicados")).textContent).toContain("No hay duplicados para revisar");
    expect(screen.queryByTestId("unidos")).toBeNull();
    fireEvent.click(screen.getByTestId("buscar-duplicados"));
    expect((await screen.findByTestId("mensaje")).textContent).toContain("Aparecieron 2 posibles duplicados");
    expect(pedido("/equivalencias/buscar")![1].method).toBe("POST");
  });

  it("si el servidor rechaza una unión lo dice y la sugerencia sigue ahí", async () => {
    armar();
    const [primera] = await screen.findAllByTestId("sugerencia");
    apiFalsa.mockRejectedValueOnce(new ErrorApi(409, "La sugerencia no existe o ya se resolvió"));
    fireEvent.click(within(primera!).getByTestId("unir"));
    expect((await screen.findByTestId("error-duplicados")).textContent).toContain("ya se resolvió");
    expect(screen.getAllByTestId("sugerencia")).toHaveLength(2);
  });

  it("sin conexión avisa que unir y separar necesitan internet y no deja tocar", async () => {
    armar();
    await screen.findAllByTestId("sugerencia");
    act(() => { vi.spyOn(navigator, "onLine", "get").mockReturnValue(false); window.dispatchEvent(new Event("offline")); });
    expect(screen.getByTestId("sin-conexion").textContent).toContain("necesitan internet");
    expect((screen.getAllByTestId("unir")[0] as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTestId("separar") as HTMLButtonElement).disabled).toBe(true);
    act(() => { vi.spyOn(navigator, "onLine", "get").mockReturnValue(true); window.dispatchEvent(new Event("online")); });
  });

  it("si no se pueden cargar lo dice y deja reintentar", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    dibujar(<Duplicados />, "duplicados");
    expect((await screen.findByTestId("error-de-carga")).textContent).toContain("No se pudieron cargar los duplicados");
    apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/equivalencias" ? SUGERENCIAS() : []));
    fireEvent.click(screen.getByTestId("reintentar"));
    expect(await screen.findAllByTestId("sugerencia")).toHaveLength(2);
  });
});
