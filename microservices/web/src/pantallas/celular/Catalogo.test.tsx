/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";
import { ObservadorFalso } from "../../pruebas/preparar";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown; traerPorCodigo: (c: string) => Promise<unknown> } }));
vi.mock("../../catalogo", async () => (await import("../../pruebas/catalogo-falso")).moduloDeCatalogo(() => catalogo.actual));
const descargar = vi.fn<(...a: any[]) => Promise<void>>(async () => undefined);
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>(async () => []));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), descargar: (...a: unknown[]) => descargar(...a), api: (...a: unknown[]) => apiFalsa(...a) }));

vi.mock("../../plataforma/camara/Escaner", () => ({
  hayCamara: () => true,
  Escaner: ({ alDetectar }: { alDetectar: (c: string) => void }) => <div data-testid="escaner">{["7791234567890", "111"].map((c) => <button key={c} type="button" onClick={() => alDetectar(c)}>leer {c}</button>)}</div>,
}));
import { Catalogo } from "./Catalogo";

// Todo lo que pidió el dueño para Productos, sobre el rediseño: la lista busca con debounce y
// carga de a 30; la ficha tiene el margen (botones o tipeado), los proveedores, la foto y el
// Excel de origen; los atajos de teclado siguen funcionando sin foco.
function armar(productos = [
  producto({ id: "mecha", descripcion: "MECHA PARA MADERA 6 MM", codigo_proveedor: "ME6", costo_neto: "1500", explicacion_costo: ["Precio de lista 2000", "− 25 % (linea) = 1500"] }),
  producto({ id: "taladro", descripcion: "TALADRO PERCUTOR 750 W", costo_neto: "120000" }),
], sub: string | null = null) {
  const falso = catalogoFalso(productos);
  catalogo.actual = falso;
  vi.useFakeTimers();
  const r = render(<Catalogo sub={sub} />);
  const buscar = (texto: string) => {
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: texto } });
    act(() => { vi.advanceTimersByTime(350); }); // debounce
  };
  return { ...r, falso, buscar };
}
const fila = (texto: string) => screen.getAllByTestId("producto").find((f) => f.textContent?.includes(texto))!;
const ficha = () => screen.getByTestId("ficha-producto");

describe("Catálogo · Productos", () => {
  beforeEach(() => { vi.useRealTimers(); descargar.mockClear(); });

  it("busca con debounce, muestra el precio redondeado para arriba a $1.000 y abre la ficha", () => {
    const { buscar } = armar();
    fireEvent.change(screen.getByTestId("busqueda"), { target: { value: "mecha" } });
    expect(screen.getAllByTestId("producto")).toHaveLength(2); // todavía no pasaron los 300 ms: sigue la lista entera
    act(() => { vi.advanceTimersByTime(350); });
    expect(screen.getAllByTestId("producto")).toHaveLength(1);
    expect(fila("MECHA").textContent).toContain("sin margen");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "100 %" }));
    expect(within(ficha()).getByRole("button", { name: "100 %" }).className).toContain("activo");
    expect(within(ficha()).getByTestId("precio-de-venta").textContent).toBe("$4.000"); // 1500 × 2 × 1,21 = 3630 → 4000
    fireEvent.keyDown(window, { key: "Escape" });
    expect(fila("MECHA").textContent).toContain("$4.000");
    buscar("taladro");
    fireEvent.click(fila("TALADRO"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "25 %" }));
    expect(within(ficha()).getByTestId("precio-de-venta").textContent).toBe("$182.000"); // 181.500 → 182.000
  });

  it("el margen elegido se guarda en el producto (memoria al recargar)", () => {
    const { buscar, falso } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "50 %" }));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { margen_elegido: 50 });
  });

  it("'otro margen' es un porcentaje, no un precio: 20 → 20 % de margen", () => {
    const { buscar, falso } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    const caja = within(ficha()).getByTestId("otro-margen");
    fireEvent.change(caja, { target: { value: "20" } });
    fireEvent.keyDown(caja, { key: "Enter" });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { margen_elegido: 20 });
    expect(within(ficha()).getByTestId("precio-de-venta").textContent).toBe("$3.000"); // 1500 × 1,2 × 1,21 = 2178 → 3000
    expect(ficha().textContent).toContain("20 % a mano");
    for (const m of ["300 %", "200 %", "100 %", "50 %", "25 %"]) expect(within(ficha()).getByRole("button", { name: m }).className).not.toContain("activo");
  });

  it("016-E18 016-E19: «Así se calcula» se despliega con la cuenta del costo y del precio, y sigue al margen", () => {
    const { buscar } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByRole("button", { name: "100 %" }));
    expect(within(ficha()).queryByTestId("cuenta")).toBeNull(); // plegado al abrir
    fireEvent.click(within(ficha()).getByTestId("abrir-calculo"));
    const cuenta = within(ficha()).getByTestId("cuenta").textContent!;
    expect(cuenta).toContain("− 25 % (linea) = 1500"); // de dónde sale el costo
    expect(cuenta).toContain("+ Margen 100 %$1.500,00");
    expect(cuenta).toContain("+ IVA 21 %$630,00");
    expect(cuenta).toContain("= Precio con IVA$3.630,00");
    expect(within(ficha()).getByTestId("se-cobra").textContent).toBe("$4.000");
    expect(cuenta).toContain("Se redondea hacia arriba a $1.000");
    fireEvent.click(within(ficha()).getByRole("button", { name: "50 %" })); // 1500 × 1,5 × 1,21 = 2722,5 → 3000
    expect(within(ficha()).getByTestId("se-cobra").textContent).toBe("$3.000");
    fireEvent.click(within(ficha()).getByTestId("abrir-calculo"));
    expect(within(ficha()).queryByTestId("cuenta")).toBeNull(); // se pliega
  });

  it("flechas, Enter y Shift+número funcionan aunque la búsqueda no tenga el foco", () => {
    const { buscar, falso } = armar();
    buscar("marca");
    expect(screen.getAllByTestId("producto")[0]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.body, { key: "ArrowDown" });
    expect(screen.getAllByTestId("producto")[1]!.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(document.body, { key: "2", code: "Digit2", shiftKey: true });
    const id = screen.getAllByTestId("producto")[1]!.textContent?.includes("MECHA") ? "mecha" : "taladro";
    expect(falso.actualizarProducto).toHaveBeenCalledWith(id, { margen_elegido: 200 });
    fireEvent.keyDown(document.body, { key: "Enter" });
    expect(screen.getByTestId("ficha-producto")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("ficha-producto")).toBeNull();
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect((screen.getByTestId("busqueda") as HTMLInputElement).value).toBe("");
  });

  it("018-E01 018-E02: trae de a 50 y los siguientes al llegar al final", () => {
    const muchos = Array.from({ length: 60 }, (_, i) => producto({ id: `t${i}`, descripcion: `TUERCA SCROLL ${i + 1}` }));
    const { buscar } = armar(muchos);
    buscar("tuerca");
    expect(screen.getAllByTestId("producto")).toHaveLength(50);
    expect(screen.getByTestId("cargar-mas")).toBeTruthy();
    act(() => { ObservadorFalso.ultimo!.cruzar(); });
    expect(screen.getAllByTestId("producto")).toHaveLength(60);
    expect(screen.queryByTestId("cargar-mas")).toBeNull();
  });

  it("desde la ficha se baja el Excel original de la lista", () => {
    const { buscar } = armar();
    buscar("mecha");
    fireEvent.click(fila("MECHA"));
    fireEvent.click(within(ficha()).getByTestId("bajar-lista"));
    expect(descargar).toHaveBeenCalledWith("/listas/lista-1/archivo", expect.stringContaining("Proveedor uno"));
  });

  it("con varios proveedores marca el más barato y permite usar otro", () => {
    const { buscar, falso } = armar([producto({ id: "sil", descripcion: "SILICONA", costo_neto: "2400", proveedor: "Barato", proveedor_id: "b", proveedores: [
      { proveedor_id: "b", proveedor: "Barato", costo_neto: "2400", fecha_lista: "2026-08-11", codigo_proveedor: "S1" },
      { proveedor_id: "c", proveedor: "Caro", costo_neto: "3000", fecha_lista: "2026-08-11", codigo_proveedor: "S2" },
    ] })]);
    buscar("silicona");
    fireEvent.click(fila("SILICONA"));
    // 016-E14 016-E15 016-E16: primero el que está en uso, con la estrella si es el más barato; la flecha muestra los demás.
    const enUso = within(ficha()).getByTestId("proveedor-en-uso");
    expect(enUso.textContent).toContain("Barato★Proveedor principal");
    expect(enUso.textContent).toContain("Costo de compra$2.400,00");
    expect(within(ficha()).queryByTestId("otros-proveedores")).toBeNull();
    fireEvent.click(enUso);
    const otros = within(ficha()).getByTestId("otros-proveedores");
    expect(otros.textContent).toContain("Caro");
    expect(otros.textContent).toContain("$3.000,00");
    fireEvent.click(within(otros).getByTestId("proveedor-de-producto"));
    expect(falso.actualizarProducto).toHaveBeenCalledWith("sil", { proveedor_preferido_id: "c" });
  });

  it("los segmentos llevan a Listas y Duplicados", () => {
    armar(undefined, "duplicados");
    expect(screen.getByRole("tab", { name: "Duplicados" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("buscar-duplicados")).toBeTruthy();
  });

  // RF-72: lo que no se puede usar no se muestra.
  it("sin el permiso de fijar márgenes, la ficha no tiene los botones y los atajos no cambian nada", () => {
    conPermisos("ventas.registrar");
    const { falso } = armar();
    expect(screen.queryByRole("tab", { name: "Listas" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Duplicados" })).toBeNull();
    fireEvent.keyDown(document.body, { code: "Digit1", key: "!", shiftKey: true });
    fireEvent.click(fila("MECHA"));
    expect(within(ficha()).queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByTestId("otro-margen")).toBeNull();
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
  });

  it("entrar por la dirección a una pestaña sin permiso dice qué permiso falta", () => {
    conPermisos("catalogo.margenes");
    armar(undefined, "listas");
    expect(screen.getByTestId("sin-permiso").textContent).toContain("Cargar listas de precios");
  });

  // RF-08: buscar escaneando. La cámara se simula.
  it("escanear el código de un producto abre su ficha; uno que nadie tiene lo dice y queda en la búsqueda", async () => {
    armar([producto({ id: "mecha", descripcion: "MECHA PARA MADERA 6 MM", codigo_barras: "7791234567890" }), producto({ id: "taladro", descripcion: "TALADRO PERCUTOR 750 W" })]);
    fireEvent.click(screen.getByTestId("escanear"));
    fireEvent.click(screen.getByRole("button", { name: "leer 7791234567890" }));
    // Escanear responde un instante después: el producto puede venir del servidor (RF-85).
    await act(async () => { await Promise.resolve(); });
    expect(within(ficha()).getByText("MECHA PARA MADERA 6 MM")).toBeTruthy();
    expect(within(ficha()).getByTestId("codigo-actual").textContent).toBe("7791234567890");
    fireEvent.click(screen.getByTestId("escanear"));
    fireEvent.click(screen.getByRole("button", { name: "leer 111" }));
    await act(async () => { await Promise.resolve(); });
    expect((screen.getByTestId("busqueda") as HTMLInputElement).value).toBe("111");
    expect(document.body.textContent).toContain("Ningún producto tiene el código 111");
  });

  // Decisión 53: los costos se ven solo con «Ver costos».
  it("sin el permiso de ver costos no aparece el costo, ni los proveedores con lo que cobran, ni la explicación del precio", () => {
    conPermisos("catalogo.margenes");
    armar([producto({ id: "mecha", descripcion: "MECHA PARA MADERA 6 MM", costo_neto: "1500", margen_elegido: 100, explicacion_costo: ["Precio de lista 2000"],
      proveedores: [{ proveedor_id: "p1", proveedor: "Proveedor uno", costo_neto: "1500", fecha_lista: "2026-08-11", codigo_proveedor: "ME6" }] })]);
    expect(fila("MECHA").textContent).not.toContain("costo");
    expect(fila("MECHA").textContent).not.toContain("1.500");
    fireEvent.click(fila("MECHA"));
    expect(ficha().textContent).toContain("$4.000"); // el precio sí: 1500 × 2 × 1,21 = 3630 → 4000
    expect(within(ficha()).getByTestId("precio-de-venta").textContent).toBe("$4.000");
    expect(within(ficha()).queryByTestId("asi-se-calcula")).toBeNull(); // 016-E21
    expect(within(ficha()).queryByTestId("proveedor-en-uso")).toBeNull();
    expect(within(ficha()).queryByTestId("archivo-de-origen")).toBeNull();
    expect(ficha().textContent).not.toContain("1.500");
    expect(within(ficha()).queryByTestId("otros-proveedores")).toBeNull();
    expect(within(ficha()).queryByTestId("bajar-lista")).toBeNull();
    expect(within(ficha()).getByRole("radiogroup")).toBeTruthy(); // fijar el margen es otro permiso
  });
});
