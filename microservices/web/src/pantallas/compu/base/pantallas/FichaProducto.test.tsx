/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../../../pruebas/catalogo-falso";

// La ficha del producto renovada en la computadora (specs/016): la maqueta A en dos columnas.
const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso(), traerPorCodigo: async () => null, traerPorIds: async () => undefined }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const subir = vi.hoisted(() => vi.fn(async () => "/fotos/nueva.jpg"));
const descargar = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../../../api", async (original) => ({ ...(await original<typeof import("../../../../api")>()), api: (...a: unknown[]) => apiFalsa(...a), subirFoto: (...a: unknown[]) => (subir as any)(...a), descargar: (...a: unknown[]) => (descargar as any)(...a) }));
import { FichaProducto } from "./FichaProducto";
import { olvidarOrigenes } from "../../../../negocio/catalogo/ficha";
import { ventaActual } from "../../../../negocio/ventas/venta-en-curso";

const CINTA = producto({ id: "cinta", proveedor_id: "co", descripcion: "Cinta aisladora negra 20 m", marca: "3M", codigo_proveedor: "CO-60127", costo_neto: "420", margen_elegido: 200, proveedor: "Comodo", fecha_lista: "2026-09-05", lista_importada_id: "l-0",
  proveedores: [{ proveedor_id: "co", proveedor: "Comodo", costo_neto: "420", fecha_lista: "2026-09-05", codigo_proveedor: "CO-60127" }], foto_url: "/fotos/cinta.jpg" });
const ORIGEN = { id: "l-0", archivo_nombre: "lista_comodo_05-09-2026.xlsx", proveedor: "Comodo", fecha_lista: "2026-09-05", productos: 7096 };

function armar(p = CINTA, stock?: number) {
  const falso = catalogoFalso([{ ...p }]);
  if (stock !== undefined) falso.stock.set(p.id, stock);
  catalogo.actual = falso;
  const alCambiar = vi.fn();
  render(<FichaProducto producto={falso.catalogo[0]!} alCerrar={() => undefined} alCambiar={alCambiar} quienLoTiene={() => undefined} />);
  return { alCambiar, ficha: screen.getByTestId("ficha-producto") };
}

describe("ficha del producto · computadora", () => {
  beforeEach(() => { apiFalsa.mockReset(); apiFalsa.mockResolvedValue(ORIGEN); olvidarOrigenes(); subir.mockClear(); descargar.mockClear(); });

  it("016-E01 016-E03: arriba la foto con «Cambiar foto», el stock como en el Catálogo, el nombre, la marca y el código", () => {
    const { ficha } = armar(CINTA, 40);
    expect(within(ficha).getByTestId("stock").textContent).toBe("40 un. en stock");
    expect(within(ficha).getByRole("heading", { level: 2 }).textContent).toBe("Cinta aisladora negra 20 m"); // en mayúsculas por estilo
    expect(ficha.querySelector(".ficha-columnas")!.children).toHaveLength(2); // dos columnas
    expect(ficha.textContent).toContain("3M · Código CO-60127");
    expect(within(ficha).getByTestId("cambiar-foto").textContent).toBe("Cambiar foto");
  });

  it("016-E02 016-E04: sin foto, «Sacar foto» en un lugar neutro; sin stock, «Sin stock»", () => {
    const { ficha } = armar({ ...CINTA, foto_url: null });
    expect(within(ficha).getByTestId("cambiar-foto").textContent).toBe("Subir foto");
    expect(ficha.querySelector(".ficha-foto")!.className).toContain("sin");
    const stock = within(ficha).getByTestId("stock");
    expect(stock.textContent).toBe("Sin stock");
    expect(stock.className).toContain("no");
  });

  it("016-E05: la foto nueva se sube y queda en el producto", async () => {
    const { ficha, alCambiar } = armar();
    const foto = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    await act(async () => { fireEvent.change(within(ficha).getByTestId("archivo-foto-ficha"), { target: { files: [foto] } }); });
    expect(subir).toHaveBeenCalledWith("cinta", foto);
    expect(alCambiar).toHaveBeenCalledWith({ foto_url: "/fotos/nueva.jpg" });
  });

  it("016-E14 016-E15 016-E17: el proveedor en uso, con su inicial, la estrella, la fecha y el costo; con uno solo, sin flecha", () => {
    const { ficha } = armar();
    const enUso = within(ficha).getByTestId("proveedor-en-uso");
    expect(enUso.textContent).toBe("CComodo★Proveedor principalÚltima lista: 05/09/2026Costo de compra$420,00");
    expect((enUso as HTMLButtonElement).disabled).toBe(true);
    expect(enUso.querySelector(".ficha-flecha")).toBeNull();
  });

  it("016-E20: sin costo, el precio y «Así se calcula» dicen qué falta", () => {
    const { ficha } = armar({ ...CINTA, costo_neto: null, margen_elegido: null, proveedores: [] });
    expect(within(ficha).getByTestId("sin-precio").textContent).toBe("sin costo");
    fireEvent.click(within(ficha).getByTestId("abrir-calculo"));
    expect(within(ficha).getByTestId("cuenta").textContent).toContain("Sin costo");
  });

  it("016-E22 016-E23: el archivo de origen con su nombre, el proveedor, la fecha y cuántos productos; se descarga", async () => {
    const { ficha } = armar();
    await waitFor(() => expect(within(ficha).getByTestId("archivo-de-origen").textContent).toContain("lista_comodo_05-09-2026.xlsx"));
    expect(within(ficha).getByTestId("archivo-de-origen").textContent).toContain("Comodo · 05/09/2026 · 7.096 productos");
    fireEvent.click(within(ficha).getByTestId("bajar-lista"));
    expect(descargar).toHaveBeenCalledWith("/listas/l-0/archivo", "lista_comodo_05-09-2026.xlsx");
  });

  it("016-E22: sin conexión dice el proveedor y la fecha, y que el resto necesita internet", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    const { ficha } = armar();
    await waitFor(() => expect(within(ficha).getByTestId("archivo-de-origen").textContent).toContain("Sin conexión"));
    expect(within(ficha).getByTestId("archivo-de-origen").textContent).toContain("Comodo · 05/09/2026");
  });

  it("016-E24: un producto que no salió de una lista no tiene archivo de origen", () => {
    const { ficha } = armar({ ...CINTA, lista_importada_id: null });
    expect(within(ficha).queryByTestId("archivo-de-origen")).toBeNull();
  });

  it("016-E25: «Agregar a la venta» lo agrega con las reglas del Catálogo, lo avisa y la ficha sigue abierta", () => {
    const { ficha } = armar();
    fireEvent.click(within(ficha).getByTestId("ficha-agregar"));
    fireEvent.click(within(ficha).getByTestId("ficha-agregar"));
    expect(ventaActual().items).toEqual([expect.objectContaining({ descripcion: "Cinta aisladora negra 20 m", cantidad: 2 })]);
    expect(within(ficha).getByTestId("mensaje-ficha").textContent).toContain("Agregado a la venta: Cinta aisladora negra 20 m");
    expect(screen.getByTestId("ficha-producto")).toBeTruthy();
  });

  it("016-E26 016-E21: sin permiso de vender no hay «Agregar a la venta»; sin ver costos, ni proveedor ni archivo", () => {
    conPermisos("catalogo.margenes");
    const { ficha } = armar();
    expect(within(ficha).queryByTestId("ficha-agregar")).toBeNull();
    expect(within(ficha).queryByTestId("proveedor-en-uso")).toBeNull();
    expect(within(ficha).queryByTestId("archivo-de-origen")).toBeNull();
    expect(apiFalsa).not.toHaveBeenCalled();
  });

  it("016-E16: con más de un proveedor, la flecha los muestra y se elige de cuál sale el costo", () => {
    const { ficha, alCambiar } = armar({ ...CINTA, proveedor_id: "co", proveedores: [
      { proveedor_id: "co", proveedor: "Comodo", costo_neto: "420", fecha_lista: "2026-09-05", codigo_proveedor: "CO-60127" },
      { proveedor_id: "ix", proveedor: "Ixnova", costo_neto: "455.8", fecha_lista: "2026-09-08", codigo_proveedor: "IX-1" },
    ] });
    fireEvent.click(within(ficha).getByTestId("proveedor-en-uso"));
    const otros = within(ficha).getByTestId("otros-proveedores");
    expect(otros.textContent).toContain("IxnovaÚltima lista: 08/09/2026$455,80");
    fireEvent.click(within(otros).getByTestId("proveedor-de-producto"));
    expect(alCambiar).toHaveBeenCalledWith({ proveedor_preferido_id: "ix" });
  });

  it("016-E18 016-E19: «Así se calcula» plegado; desplegado, la cuenta hasta lo que se cobra", () => {
    const { ficha } = armar();
    expect(within(ficha).queryByTestId("cuenta")).toBeNull();
    fireEvent.click(within(ficha).getByTestId("abrir-calculo"));
    const cuenta = within(ficha).getByTestId("cuenta").textContent!;
    expect(cuenta).toContain("Costo de compra (Comodo)$420,00");
    expect(cuenta).toContain("+ Margen 200 %$840,00");
    expect(cuenta).toContain("+ IVA 21 %$264,60");
    expect(cuenta).toContain("= Precio con IVA$1.524,60");
    expect(within(ficha).getByTestId("se-cobra").textContent).toBe("$2.000");
  });

  it("016-E21: sin permiso de ver costos tampoco hay «Así se calcula»; sin el de márgenes, el precio dice «sin margen»", () => {
    conPermisos("ventas.registrar");
    const { ficha } = armar({ ...CINTA, margen_elegido: null });
    expect(within(ficha).queryByTestId("asi-se-calcula")).toBeNull();
    expect(within(ficha).getByTestId("sin-precio").textContent).toBe("sin margen");
  });

  it("016-E05: si la foto no se puede subir, lo dice", async () => {
    subir.mockRejectedValueOnce(new Error("La foto pesa más de 10 MB"));
    const { ficha } = armar();
    await act(async () => { fireEvent.change(within(ficha).getByTestId("archivo-foto-ficha"), { target: { files: [new File(["x"], "f.jpg", { type: "image/jpeg" })] } }); });
    expect(within(ficha).getByTestId("mensaje-ficha").textContent).toContain("No se pudo subir la foto: La foto pesa más de 10 MB");
  });
});
