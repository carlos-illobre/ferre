/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../../pruebas/catalogo-falso";

// La ficha del producto en la computadora (specs/016), al lado de la lista como la v2 (decisión 145).
const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../../negocio/catalogo", async (original) => ({ ...(await original<typeof import("../../../negocio/catalogo")>()), ...((await import("../../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual)) }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const subir = vi.hoisted(() => vi.fn(async () => "/fotos/nueva.jpg"));
const descargar = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("../../../datos/conexion", async (original) => ({ ...(await original<typeof import("../../../datos/conexion")>()), api: (...a: unknown[]) => apiFalsa(...a), subirFoto: (...a: unknown[]) => (subir as any)(...a), descargar: (...a: unknown[]) => (descargar as any)(...a) }));
import { FichaAlLado } from "./FichaAlLado";
import { olvidarOrigenes } from "../../../negocio/catalogo/ficha";
import { ventaActual } from "../../../negocio/ventas/venta-en-curso";

const CINTA = producto({ id: "cinta", proveedor_id: "co", descripcion: "Cinta aisladora negra 20 m", marca: "3M", codigo_proveedor: "CO-60127", costo_neto: "420", margen_elegido: 200, proveedor: "Comodo", fecha_lista: "2026-09-05", lista_importada_id: "l-0",
  proveedores: [{ proveedor_id: "co", proveedor: "Comodo", costo_neto: "420", fecha_lista: "2026-09-05", codigo_proveedor: "CO-60127" }], foto_url: "/fotos/cinta.jpg" });
const ORIGEN = { id: "l-0", archivo_nombre: "lista_comodo_05-09-2026.xlsx", proveedor: "Comodo", fecha_lista: "2026-09-05", productos: 7096 };

function armar(p = CINTA, stock?: number, vende = true) {
  const falso = catalogoFalso([{ ...p }]);
  if (stock !== undefined) falso.stock.set(p.id, stock);
  catalogo.actual = falso;
  const alCambiar = vi.fn();
  const alAgregar = vi.fn();
  const ficha = (abierto: boolean) => <FichaAlLado producto={falso.catalogo[0]!} alCambiar={alCambiar} quienLoTiene={async () => undefined} alAgregar={vende ? alAgregar : undefined} alListo={() => undefined} alCargarCodigo={() => undefined} calculoAbierto={abierto} alPlegarCalculo={() => undefined} />;
  const { rerender } = render(ficha(true));
  return { alCambiar, alAgregar, ficha: screen.getByTestId("ficha-producto"), plegado: () => rerender(ficha(false)) };
}

describe("ficha del producto · computadora", () => {
  beforeEach(() => { apiFalsa.mockReset(); apiFalsa.mockResolvedValue(ORIGEN); olvidarOrigenes(); subir.mockClear(); descargar.mockClear(); });

  it("016-E01 016-E03: arriba la foto con «Cambiar foto», el stock como en el Catálogo, el nombre, la marca y el código", () => {
    const { ficha } = armar(CINTA, 40);
    expect(within(ficha).getByTestId("stock").textContent).toBe("40 un. en stock");
    expect(within(ficha).getByRole("heading", { level: 2 }).textContent).toBe("Cinta aisladora negra 20 m");
    expect(ficha.textContent).toContain("3M · Cód. CO-60127");
    expect(within(ficha).getByTestId("cambiar-foto").textContent).toBe("Cambiar foto");
  });

  it("016-E02 016-E04: sin foto, «Sacar foto» en un lugar neutro; sin stock, «Sin stock»", () => {
    const { ficha } = armar({ ...CINTA, foto_url: null });
    expect(within(ficha).getByTestId("cambiar-foto").textContent).toBe("Subir foto");
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

  it("016-E14 016-E15 016-E17: el proveedor en uso, con su inicial, la estrella, la fecha y el costo; con uno solo, nada que elegir", () => {
    const { ficha } = armar();
    expect(within(ficha).getByTestId("proveedor-en-uso").textContent).toBe("CComodoel más baratoPrincipal · lista 05/09$420,00en uso");
    expect(within(ficha).queryByTestId("proveedor-de-producto")).toBeNull();
  });

  it("016-E20: sin costo, el precio y «Así se calcula» dicen qué falta", () => {
    const { ficha } = armar({ ...CINTA, costo_neto: null, margen_elegido: null, proveedores: [] });
    expect(within(ficha).getByTestId("sin-precio").textContent).toBe("sin costo");
    expect(within(ficha).getByTestId("cuenta-del-precio").textContent).toContain("Sin costo");
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

  it("016-E25: «Agregar a la venta» lo agrega (lo avisa la lista) y la ficha sigue abierta", () => {
    const { ficha, alAgregar } = armar();
    fireEvent.click(within(ficha).getByTestId("ficha-agregar"));
    fireEvent.click(within(ficha).getByTestId("ficha-agregar"));
    expect(alAgregar).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("ficha-producto")).toBeTruthy();
  });

  it("016-E26 016-E21: sin permiso de vender no hay «Agregar a la venta»; sin ver costos, ni proveedor ni archivo", () => {
    conPermisos("catalogo.margenes");
    const { ficha } = armar(CINTA, undefined, false);
    expect(within(ficha).queryByTestId("ficha-agregar")).toBeNull();
    expect(within(ficha).queryByTestId("proveedor-en-uso")).toBeNull();
    expect(within(ficha).queryByTestId("archivo-de-origen")).toBeNull();
    expect(apiFalsa).not.toHaveBeenCalled();
  });

  it("016-E16: con más de un proveedor, están todos a la vista y se elige de cuál sale el costo", () => {
    const { ficha, alCambiar } = armar({ ...CINTA, proveedor_id: "co", proveedores: [
      { proveedor_id: "co", proveedor: "Comodo", costo_neto: "420", fecha_lista: "2026-09-05", codigo_proveedor: "CO-60127" },
      { proveedor_id: "ix", proveedor: "Ixnova", costo_neto: "455.8", fecha_lista: "2026-09-08", codigo_proveedor: "IX-1" },
    ] });
    const otros = within(ficha).getByTestId("otros-proveedores");
    expect(otros.textContent).toContain("IxnovaLista 08/09 · $455,80 · +8,5 %Usar");
    fireEvent.click(within(otros).getByTestId("proveedor-de-producto"));
    expect(alCambiar).toHaveBeenCalledWith({ proveedor_preferido_id: "ix" });
  });

  it("016-E18 016-E19: «Así se calcula» abierto, con la cuenta hasta lo que se cobra; plegado, solo lo que se cobra", () => {
    const { ficha, plegado } = armar();
    const cuenta = within(ficha).getByTestId("cuenta-del-precio").textContent!;
    expect(cuenta).toContain("Costo de compra$420,00");
    expect(cuenta).toContain("+ 200 % de margen$1.260,00");
    expect(cuenta).toContain("+ IVA 21 %$1.524,60");
    expect(within(ficha).getByTestId("se-cobra").textContent).toBe("$2.000");
    plegado();
    expect(within(screen.getByTestId("ficha-producto")).getByTestId("cuenta-del-precio").textContent).toBe("Se cobra (a $1.000)$2.000");
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
