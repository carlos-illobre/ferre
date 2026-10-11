/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { Contar, reiniciarConteo } from "./Contar";

type Renglon = { producto_id: string; cantidad_contada: string; contado_en: string; descripcion: string; marca: string | null; stock_teorico: string };
const SECTORES = [
  { id: "s1", nombre: "Estantería 1", productos: "3", ultimo_conteo: null, conteo_abierto: "c1" },
  { id: "s2", nombre: "Mostrador", productos: "1", ultimo_conteo: new Date().toISOString(), conteo_abierto: null },
  { id: "s3", nombre: "Pared", productos: "0", ultimo_conteo: null, conteo_abierto: null },
];
const renglon = (id: string, descripcion: string, contada: number, teorico: number): Renglon => ({ producto_id: id, cantidad_contada: String(contada), contado_en: "2026-10-09T10:00:00Z", descripcion, marca: "MARCA", stock_teorico: String(teorico) });

/** Un servidor de mentira con un conteo abierto en la Estantería 1: una mecha ya contada y un clavo sin contar. */
function armar({ sectores = SECTORES }: { sectores?: typeof SECTORES } = {}) {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA CONTAR 6 MM" }),
    producto({ id: "clavo", descripcion: "CLAVO CONTAR", unidad: "kg" }),
    producto({ id: "suelto", descripcion: "SUELTO CONTAR", codigo_barras: "7790000000017" }),
  ]);
  falso.stock.set("suelto", 4);
  catalogo.actual = falso;
  const conteo = { id: "c1", estado: "abierto", sector_id: "s1", sector: "Estantería 1", renglones: [renglon("mecha", "MECHA CONTAR 6 MM", 5, 6)], sin_contar: [{ producto_id: "clavo", descripcion: "CLAVO CONTAR", marca: null, stock_teorico: "12.5" }] };
  apiFalsa.mockImplementation(async (ruta: string, opciones?: RequestInit) => {
    if (ruta === "/sectores" && opciones?.method === "POST") return { id: "s9", nombre: "Fondo" };
    if (ruta === "/sectores") return sectores;
    if (ruta === "/conteos") return { id: "c1", retomado: true };
    if (ruta === "/conteos/c1") return conteo;
    if (ruta === "/conteos/c1/cerrar") return { sector: "Estantería 1", contados: conteo.renglones.length, ajustados: 1, sin_contar: 1, puestos_en_cero: 0 };
    return [];
  });
  const vista = dibujar(<Contar />, "contar");
  const sector = (nombre: string) => screen.getAllByTestId("sector").find((s) => s.textContent?.includes(nombre))!;
  const abrir = async () => { fireEvent.click(within(await screen.findByText("Estantería 1").then(() => sector("Estantería 1"))).getByTestId("abrir-sector")); await screen.findByTestId("contados"); };
  return { vista, sector, abrir, conteo };
}

describe("Contar stock (v4)", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockReset(); enviarOEncolar.mockImplementation(async () => ({ encolado: false })); reiniciarConteo(); });

  it("muestra cada sector con su estado; el que quedó a medias va primero y se retoma", async () => {
    const { sector } = armar();
    await screen.findByTestId("sectores");
    expect(screen.getAllByTestId("sector")[0]!.textContent).toContain("Estantería 1");
    expect(sector("Estantería 1").textContent).toContain("Conteo a medias");
    expect(within(sector("Estantería 1")).getByTestId("abrir-sector").textContent).toBe("Retomar");
    expect(sector("Mostrador").textContent).toContain("Contado hoy");
    expect(within(sector("Mostrador")).getByTestId("abrir-sector").textContent).toBe("Contar de nuevo");
    expect(sector("Pared").textContent).toContain("Nunca contado");
    expect(within(sector("Pared")).getByTestId("abrir-sector").textContent).toBe("Empezar");
  });

  it("retomar abre el conteo con lo ya contado y lo que falta", async () => {
    const { abrir } = armar();
    await abrir();
    expect(apiFalsa).toHaveBeenCalledWith("/conteos", expect.objectContaining({ method: "POST", body: JSON.stringify({ sector_id: "s1" }) }));
    expect(screen.getByTestId("avance").textContent).toBe("Ya contaste 1 producto");
    expect(screen.getByTestId("contado").textContent).toContain("Había 6, hay 5");
    expect(screen.getByTestId("sin-contar").textContent).toContain("CLAVO CONTAR");
  });

  it("el número arranca en lo que dice el sistema y «Siguiente» guarda lo contado", async () => {
    const { abrir } = armar();
    await abrir();
    fireEvent.click(within(screen.getByTestId("sin-contar")).getByRole("button"));
    const cuantas = screen.getByTestId("cantidad") as HTMLInputElement;
    expect(cuantas.value).toBe("12,5");
    fireEvent.change(cuantas, { target: { value: "11,5" } });
    fireEvent.click(screen.getByTestId("siguiente"));
    await waitFor(() => expect(enviarOEncolar).toHaveBeenCalledWith("conteo.renglon", "PUT", "/conteos/c1/renglones/clavo", { cantidad: 11.5 }));
    await waitFor(() => expect(screen.queryByTestId("contando")).toBeNull());
  });

  it("buscar o escribir el código elige el producto; lo que no está en el sector arranca en su stock", async () => {
    const { abrir } = armar();
    await abrir();
    const busqueda = screen.getByTestId("busqueda");
    fireEvent.change(busqueda, { target: { value: "7790000000017" } });
    fireEvent.keyDown(busqueda, { key: "Enter" });
    expect(screen.getByTestId("contando").textContent).toContain("SUELTO CONTAR");
    expect((screen.getByTestId("cantidad") as HTMLInputElement).value).toBe("4");
    fireEvent.click(screen.getByText("Contar otro"));
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "7790000000999" } });
    fireEvent.keyDown(screen.getByTestId("busqueda"), { key: "Enter" });
    expect(screen.getByTestId("error-conteo").textContent).toContain("no está en el catálogo");
  });

  it("un producto ya contado lo avisa y arranca en lo que se había puesto", async () => {
    const { abrir } = armar();
    await abrir();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "mecha contar" } });
    expect(screen.getByTestId("sugerencia").textContent).toContain("Contado");
    fireEvent.click(screen.getByTestId("sugerencia"));
    expect(screen.getByTestId("ya-contado").textContent).toContain("pusiste 5");
    expect((screen.getByTestId("cantidad") as HTMLInputElement).value).toBe("5");
  });

  it("sin conexión se sigue contando: lo contado queda a la vista, marcado, y no se puede cerrar hasta que llegue", async () => {
    const { abrir } = armar();
    await abrir();
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    fireEvent.click(within(screen.getByTestId("sin-contar")).getByRole("button"));
    fireEvent.click(screen.getByTestId("siguiente"));
    await waitFor(() => expect(screen.getAllByTestId("contado")).toHaveLength(2));
    expect(screen.getAllByTestId("contado")[0]!.textContent).toContain("CLAVO CONTAR");
    expect(screen.getAllByTestId("contado")[0]!.textContent).toContain("guardado en el dispositivo");
    expect(screen.queryByTestId("sin-contar")).toBeNull();
    fireEvent.click(screen.getByTestId("cerrar"));
    expect(screen.getByTestId("cierre-bloqueado")).toBeTruthy();
    expect((screen.getByTestId("confirmar-si") as HTMLButtonElement).disabled).toBe(true);
  });

  it("quitar saca el producto de lo contado", async () => {
    const { abrir } = armar();
    await abrir();
    fireEvent.click(screen.getByTestId("quitar-contado"));
    await waitFor(() => expect(enviarOEncolar).toHaveBeenCalledWith("conteo.renglon", "DELETE", "/conteos/c1/renglones/mecha", null));
    expect((await screen.findByTestId("mensaje")).textContent).toContain("salió de lo contado");
  });

  it("cerrar muestra las diferencias, deja lo no contado como está y da el resultado", async () => {
    const { abrir } = armar();
    await abrir();
    fireEvent.click(screen.getByTestId("cerrar"));
    const hoja = screen.getByTestId("confirmar-cierre");
    expect(within(hoja).getByTestId("diferencias").textContent).toContain("había 6, hay 5 unidades");
    expect(hoja.textContent).toContain("1 producto que no contaste queda como está");
    fireEvent.click(screen.getByTestId("confirmar-si"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/conteos/c1/cerrar", expect.objectContaining({ method: "POST", body: JSON.stringify({ faltantes_en_cero: false }) })));
    expect((await screen.findByTestId("exito")).textContent).toContain("Conteo cerrado: 1 ajuste");
    expect(screen.getByTestId("resultado-conteo").textContent).toBe("Estantería 1 · 1 producto contado");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(await screen.findByTestId("sectores")).toBeTruthy();
  });

  it("«Volver» deja el conteo abierto y vuelve a los sectores", async () => {
    const { abrir } = armar();
    await abrir();
    fireEvent.click(screen.getByTestId("volver"));
    expect(await screen.findByTestId("sectores")).toBeTruthy();
    expect(apiFalsa.mock.calls.some((c) => String(c[0]).endsWith("/cerrar"))).toBe(false);
  });

  it("un sector nuevo no puede repetir el nombre; al crearlo ya se empieza a contar", async () => {
    armar();
    await screen.findByTestId("sectores");
    fireEvent.click(screen.getByTestId("sector-nuevo"));
    fireEvent.change(screen.getByTestId("nombre-sector"), { target: { value: "mostrador" } });
    fireEvent.click(screen.getByTestId("crear-sector"));
    expect(screen.getByTestId("hoja-sector-nuevo").textContent).toContain("Ya hay un sector con ese nombre");
    fireEvent.change(screen.getByTestId("nombre-sector"), { target: { value: "Fondo" } });
    fireEvent.click(screen.getByTestId("crear-sector"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/sectores", expect.objectContaining({ method: "POST", body: JSON.stringify({ nombre: "Fondo" }) })));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/conteos", expect.objectContaining({ body: JSON.stringify({ sector_id: "s9" }) })));
    expect(await screen.findByTestId("contados")).toBeTruthy();
  });

  it("sin sectores invita a crear el primero; sin conexión avisa que abrir necesita internet", async () => {
    armar({ sectores: [] });
    expect((await screen.findByTestId("sin-sectores")).textContent).toContain("Todavía no hay sectores");
  });

  it("sin conexión no deja empezar ni retomar, y lo dice", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const { sector } = armar();
    await screen.findByTestId("sectores");
    expect(screen.getByTestId("sin-conexion").textContent).toContain("necesitan internet");
    expect((within(sector("Estantería 1")).getByTestId("abrir-sector") as HTMLButtonElement).disabled).toBe(true);
    vi.restoreAllMocks();
  });

  it("si el servidor no deja abrir el conteo, lo dice", async () => {
    const { sector } = armar();
    await screen.findByTestId("sectores");
    apiFalsa.mockRejectedValueOnce(new ErrorApi(400, "Elegí el sector"));
    fireEvent.click(within(sector("Pared")).getByTestId("abrir-sector"));
    expect((await screen.findByTestId("error-conteo")).textContent).toContain("Elegí el sector");
  });
});
