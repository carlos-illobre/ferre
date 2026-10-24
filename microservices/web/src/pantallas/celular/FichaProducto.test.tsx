/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

// La ficha del producto renovada en el celular (specs/016, maqueta A).
const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../negocio/catalogo", async (original) => ({ ...(await original<typeof import("../../negocio/catalogo")>()), ...((await import("../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual)) }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const subir = vi.hoisted(() => vi.fn(async () => "/fotos/nueva.jpg"));
const descargar = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a), subirFoto: (...a: unknown[]) => (subir as any)(...a), descargar: (...a: unknown[]) => (descargar as any)(...a) }));
import { FichaProducto } from "./FichaProducto";
import { olvidarOrigenes } from "../../negocio/catalogo/ficha";
import { ventaActual } from "../../negocio/ventas/venta-en-curso";

const CINTA = producto({ id: "cinta", proveedor_id: "co", descripcion: "Cinta aisladora negra 20 m", marca: "3M", codigo_proveedor: "CO-60127", costo_neto: "420", margen_elegido: 200, proveedor: "Comodo", fecha_lista: "2026-09-05", lista_importada_id: "l-0",
  proveedores: [{ proveedor_id: "co", proveedor: "Comodo", costo_neto: "420", fecha_lista: "2026-09-05", codigo_proveedor: "CO-60127" }], foto_url: "/fotos/cinta.jpg" });
const ORIGEN = { id: "l-0", archivo_nombre: "lista_comodo_05-09-2026.xlsx", proveedor: "Comodo", fecha_lista: "2026-09-05", productos: 7096 };

function armar(p = CINTA, stock?: number) {
  const falso = catalogoFalso([{ ...p }]);
  if (stock !== undefined) falso.stock.set(p.id, stock);
  catalogo.actual = falso;
  const alCambiar = vi.fn();
  render(<FichaProducto producto={falso.catalogo[0]!} alCerrar={() => undefined} alCambiar={alCambiar} quienLoTiene={async () => undefined} />);
  return { alCambiar, ficha: screen.getByTestId("ficha-producto") };
}

describe("ficha del producto · celular", () => {
  beforeEach(() => { apiFalsa.mockReset(); apiFalsa.mockResolvedValue(ORIGEN); olvidarOrigenes(); subir.mockClear(); descargar.mockClear(); });

  it("016-E01 016-E03: arriba la foto con «Cambiar foto», el stock como en el Catálogo, el nombre, la marca y el código", () => {
    const { ficha } = armar(CINTA, 40);
    expect(within(ficha).getByTestId("stock").textContent).toBe("40 un. en stock");
    expect(within(ficha).getByRole("heading", { level: 2 }).textContent).toBe("Cinta aisladora negra 20 m"); // en mayúsculas por estilo
    expect(ficha.textContent).toContain("3M · Cód. CO-60127");
    expect(within(ficha).getByTestId("cambiar-foto").textContent).toBe("Cambiar foto");
  });

  it("016-E02 016-E04: sin foto, «Sacar foto» en un lugar neutro; sin stock, «Sin stock»", () => {
    const { ficha } = armar({ ...CINTA, foto_url: null });
    expect(within(ficha).getByTestId("cambiar-foto").textContent).toBe("Sacar foto");
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
    // Como la v2: la inicial, el nombre con la estrella, «Proveedor principal · fecha» y el costo.
    expect(enUso.textContent).toBe("CComodoel más baratoProveedor principal · 05/09$420,00");
    expect(within(ficha).queryByTestId("ver-proveedores")).toBeNull();
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
});
