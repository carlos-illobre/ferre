/* eslint-disable @typescript-eslint/no-explicit-any */
import { conPermisos } from "../../pruebas/sesion";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown; traerPorCodigo: (c: string) => Promise<unknown> } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso(), traerPorCodigo: (c: string) => catalogo.actual.traerPorCodigo(c), traerPorIds: async () => undefined }));
vi.mock("../../plataforma/camara/Escaner", () => ({ Escaner: () => null, hayCamara: () => false }));
vi.mock("./componentes/VincularCelular", () => ({ VincularCelular: () => null }));
vi.mock("../../puesto", async (original) => ({ ...(await original<typeof import("../../puesto")>()), enviarCodigoAlPuesto: vi.fn(), escucharPuesto: vi.fn(() => () => undefined), puestoRemoto: () => null, puestoLocal: () => null, guardarPuestoLocal: vi.fn() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ParteVender } from "./Vender";

const ventasVacias = { ventas: [], totales: {}, total: 0 };
function armar(ventas: unknown = ventasVacias, sub: string | null = null) {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA VENDER 8 MM", costo_neto: "1000", margen_elegido: 100 }),
    producto({ id: "tornillo", descripcion: "TORNILLO VENDER", costo_neto: "10" }),
  ]);
  catalogo.actual = falso;
  apiFalsa.mockImplementation(async (ruta: string) => (ruta.startsWith("/ventas") ? ventas : []));
  const { unmount } = render(<ParteVender sub={sub} />);
  const busqueda = screen.queryByTestId("busqueda")!;
  const agregar = (texto: string) => { fireEvent.change(busqueda, { target: { value: texto } }); fireEvent.keyDown(busqueda, { key: "Enter" }); };
  const item = (texto: string) => screen.getAllByTestId("item").find((i) => i.textContent?.includes(texto))!;
  // La unidad se cambia desde el menú «⋮» del renglón (003-T001).
  const unidad = (texto: string) => {
    fireEvent.click(within(item(texto)).getByTestId("mas-del-renglon"));
    fireEvent.click(within(item(texto)).getByRole("menuitem", { name: "Vender por metro, kilo o unidad" }));
    return within(item(texto)).getByTestId("unidad");
  };
  return { falso, busqueda, agregar, item, unidad, unmount };
}

// Todo lo que pidió el dueño para Vender, sobre el rediseño: renglones como tarjetas,
// cantidades enteras o a granel, margen en el renglón, cobro con éxito a pantalla completa.
describe("Vender", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });

  it("agrega con Enter, muestra el precio redondeado a $1.000 y suma el total", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    expect(screen.getByTestId("total").textContent).toBe("$3.000"); // 1000 × 2 × 1,21 = 2420 → 3000
  });

  it("cantidades enteras por unidad: 2,7 es 2, el + suma de a 1, y nunca queda un cero", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cantidad, { target: { value: "2.7" } });
    expect(cantidad.value).toBe("2");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: "Más" }));
    expect(cantidad.value).toBe("3");
    fireEvent.change(cantidad, { target: { value: "" } });
    expect(cantidad.value).toBe("");
    fireEvent.blur(cantidad);
    expect(cantidad.value).toBe("1");
    fireEvent.change(cantidad, { target: { value: "3" } });
    expect(screen.getByTestId("total").textContent).toBe("$9.000");
  });

  it("a granel (kg) admite un decimal, el + suma de a 0,5 y la unidad queda guardada en el producto", () => {
    const { agregar, item, unidad, falso } = armar();
    agregar("mecha vender");
    fireEvent.change(unidad("MECHA"), { target: { value: "kg" } });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { unidad: "kg" });
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cantidad, { target: { value: "1.55" } });
    expect(cantidad.value).toBe("1,6");
    // 1,6 kg × $3.000 = $4.800: el renglón se redondea para arriba a $1.000 para no dar vuelto (RF-19)
    expect(screen.getByTestId("total").textContent).toBe("$5.000");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: "Más" }));
    expect(cantidad.value).toBe("2,1");
  });

  it("un producto sin margen abre el detalle y queda sin precio hasta elegirlo; el margen se guarda", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(within(item("TORNILLO")).getByTestId("margen").textContent).toContain("elegí margen");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(item("TORNILLO").textContent).toContain("$1.000"); // 10 × 4 × 1,21 = 48,4 → 1000
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
  });

  it("el detalle del renglón se abre con el chip del margen y muestra el costo con explicación", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    expect(within(item("MECHA")).queryByRole("button", { name: "50 %" })).toBeNull();
    fireEvent.click(within(item("MECHA")).getByTestId("margen"));
    expect(within(item("MECHA")).getByRole("button", { name: "100 %" }).className).toContain("activo");
    expect(item("MECHA").textContent).toContain("Costo $1.000,00");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: /Costo \$1\.000,00/ }));
    expect(screen.getByTestId("hoja-explicacion").textContent).toContain("según la lista");
  });

  it("'a mano' en el renglón es un precio absoluto solo para esta venta", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    fireEvent.click(within(item("MECHA")).getByTestId("margen"));
    fireEvent.change(within(item("MECHA")).getByTestId("precio-manual"), { target: { value: "2500" } });
    // Un precio a mano que no es múltiplo de $1.000 también se redondea para arriba
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
    expect(within(item("MECHA")).getByTestId("margen").textContent).toContain("a mano");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
  });

  it("el subtotal explica de dónde sale, incluida la cantidad", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "3" } });
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: "De dónde sale $9.000" }));
    const pasos = within(screen.getByTestId("hoja-explicacion")).getAllByRole("listitem").map((li) => li.textContent);
    expect(pasos.join(" | ")).toContain("+ 100 % de margen");
    expect(pasos.at(-1)).toContain("× 3 unidades = $9.000,00");
  });

  it("Efectivo viene elegido; con cuenta corriente sin cliente avisa, y el aviso se va al corregir", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    expect(screen.getByTestId("medio-efectivo").getAttribute("aria-checked")).toBe("true");
    // 017-E06: cada medio con su ícono y su color, el mismo que en «Hoy».
    for (const m of ["efectivo", "mercado_pago", "tarjeta", "cuenta_corriente"]) expect(screen.getByTestId(`medio-${m}`).querySelector(`.medio-icono.medio-${m}`)).not.toBeNull();
    fireEvent.click(screen.getByTestId("medio-cuenta_corriente"));
    expect(screen.getByTestId("hoja-clientes")).toBeTruthy(); // sin cliente elegido, pide elegirlo
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByRole("alert").textContent).toContain("elegí el cliente");
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(screen.getByTestId("medio-efectivo"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("el total va fuera del botón Cobrar, y no hay atajos de lo último vendido en el celular", () => {
    const { agregar } = armar();
    expect(screen.queryByTestId("sugeridos-ultimos")).toBeNull();
    agregar("mecha vender");
    expect(screen.getByTestId("cobrar").textContent).toBe("Cobrar");
    expect(screen.getByTestId("cobrar").contains(screen.getByTestId("total"))).toBe(false);
    expect(screen.getByTestId("titulo-venta").textContent).toContain("1 producto");
  });

  it("cada renglón muestra el precio por unidad y su total; la unidad queda detrás del menú «⋮»", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    const mecha = within(item("MECHA"));
    expect(mecha.queryByTestId("unidad")).toBeNull();
    expect(item("MECHA").querySelector(".unitario")?.textContent).toContain("$3.000");
    expect(item("MECHA").querySelector(".unitario")?.textContent).toContain("cada uno");
    fireEvent.click(mecha.getByRole("button", { name: "Más" }));
    expect(mecha.getByTestId("subtotal").textContent).toBe("$6.000");
    fireEvent.click(mecha.getByTestId("mas-del-renglon"));
    const menu = mecha.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((b) => b.textContent)).toEqual(["Precio a mano", "Vender por metro, kilo o unidad", "Ver la ficha del producto", "Sacar foto"]);
    fireEvent.click(within(menu).getByRole("menuitem", { name: "Precio a mano" }));
    expect(mecha.queryByRole("menu")).toBeNull();
    expect(mecha.getByTestId("precio-manual")).toBeTruthy();
  });

  it("Vaciar saca todos los productos, después de confirmar", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    agregar("tornillo vender");
    const confirmar = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByTestId("vaciar-venta"));
    expect(screen.getAllByTestId("item")).toHaveLength(2);
    fireEvent.click(screen.getByTestId("vaciar-venta"));
    expect(confirmar).toHaveBeenCalledWith("¿Vaciar la venta? Se sacan todos los productos.");
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
    confirmar.mockRestore();
  });

  it("la venta vacía muestra el dibujo y explica cómo se agrega, sin nada que tocar; con un producto se va", () => {
    const { agregar } = armar();
    expect(screen.getByText("Venta nueva")).toBeTruthy();
    const como = screen.getByTestId("como-se-agrega");
    expect(within(como).getAllByRole("listitem").map((li) => li.querySelector("b")?.textContent)).toEqual(["Escaneá", "Buscá", "Explorá"]);
    expect(within(como).queryAllByRole("button")).toHaveLength(0);
    expect(within(como).queryAllByRole("link")).toHaveLength(0);
    agregar("mecha vender");
    expect(screen.queryByTestId("como-se-agrega")).toBeNull();
  });

  it("quitar un producto es un botón con nombre, y la unidad litro se escribe L", () => {
    const { agregar, item, unidad } = armar();
    agregar("mecha vender");
    expect(unidad("MECHA").textContent).toContain("L");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: /Quitar MECHA VENDER 8 MM de la venta/ }));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("cobrar en efectivo manda la venta con cantidad, precio, margen y explicación, y muestra el éxito", async () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F5" }); // efectivo
    fireEvent.click(screen.getByTestId("cobrar"));
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Venta registrada"));
    expect(screen.getByTestId("exito").textContent).toContain("$3.000");
    expect(screen.getByTestId("exito").textContent).toContain("Efectivo");
    const cuerpo = enviarOEncolar.mock.calls[0]![3] as { medio_pago: string; items: { cantidad: number; precio_unitario: number; margen_aplicado: number; explicacion: { pasos: string[] } }[] };
    expect(cuerpo.medio_pago).toBe("efectivo");
    expect(cuerpo.items[0]).toMatchObject({ cantidad: 1, precio_unitario: 3000, margen_aplicado: 100 });
    expect(cuerpo.items[0]!.explicacion.pasos.join(" ")).toContain("+ 100 % de margen");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.queryByTestId("exito")).toBeNull();
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("el éxito muestra el total, el medio, el stock, la fecha, cuántos productos y lo vendido, con «Nueva venta» como único botón", async () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(within(screen.getByTestId("item")).getByRole("button", { name: "Más" }));
    fireEvent.click(screen.getByTestId("cobrar"));
    const exito = await screen.findByTestId("exito");
    expect(within(exito).getByRole("heading", { name: "¡Venta registrada!" })).toBeTruthy();
    expect(within(exito).getByTestId("exito-total").textContent).toBe("$6.000");
    expect(exito.textContent).toContain("Total cobrado");
    expect(exito.textContent).toContain("Efectivo");
    expect(exito.textContent).toContain("El stock ya se descontó");
    expect(exito.textContent).toMatch(/Fecha y hora\d\d\/\d\d\/\d{4} \d\d:\d\d/);
    expect(within(exito).getByTestId("exito-cuantos").textContent).toBe("1");
    const vendido = within(exito).getByTestId("vendido");
    expect(vendido.textContent).toContain("MECHA VENDER 8 MM");
    expect(vendido.textContent).toContain("2 un.");
    expect(vendido.textContent).toContain("$6.000");
    expect(within(exito).getAllByRole("button").map((b) => b.textContent)).toEqual(["Nueva venta"]);
    expect(exito.textContent).not.toMatch(/Costo|margen|ganancia|comprobante/i);
  });

  it("sin conexión, el éxito dice que quedó guardada y que se envía sola, sin decir que bajó el stock", async () => {
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("cobrar"));
    const exito = await screen.findByTestId("exito");
    expect(within(exito).getByRole("heading", { name: "Guardada en este dispositivo" })).toBeTruthy();
    expect(exito.textContent).toContain("Sin conexión: se envía sola cuando vuelva internet.");
    expect(exito.textContent).not.toContain("El stock ya se descontó");
  });

  it("Vender tiene tres pestañas, cada una con su dirección; Vender ya no muestra las ventas del día", async () => {
    armar();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Vender", "Hoy", "Anular"]);
    expect(screen.queryByTestId("hoy")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Hoy" }));
    expect(location.hash).toBe("#/vender/hoy");
    fireEvent.click(screen.getByRole("tab", { name: "Anular" }));
    expect(location.hash).toBe("#/vender/anular");
  });

  it("Hoy muestra el total y cada venta del día, sin nada para anular", async () => {
    armar({ total: 10500, totales: { efectivo: 10500 }, ventas: [
      { id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [
        { descripcion: "MECHA VENDER 8 MM", cantidad: "3", precio_unitario: "3000" }, { descripcion: "TORNILLO VENDER", cantidad: "1.5", precio_unitario: "1000" }] },
      { id: "v2", fecha: "2026-09-14T12:30:00Z", medio_pago: "tarjeta", total: "3000", estado: "anulada", cliente: null, items: [{ descripcion: "MECHA VENDER 8 MM", cantidad: "1", precio_unitario: "3000" }] },
    ] }, "hoy");
    expect((await screen.findByTestId("total-de-hoy")).textContent).toBe("$10.500");
    const ventas = screen.getAllByTestId("venta-dia");
    expect(ventas).toHaveLength(2);
    // 017-E15: de la más reciente a la más vieja; 017-E12 017-E14: la anulada, tachada y marcada.
    expect(ventas[0]!.textContent).toContain("1 × MECHA VENDER 8 MManulada");
    // 017-E11 017-E13: la de dos productos dice cuántos, y al tocarla se ven.
    expect(ventas[1]!.textContent).toContain("2 productos");
    expect(ventas[1]!.textContent).toContain("Efectivo");
    fireEvent.click(within(ventas[1]!).getByRole("button", { expanded: false }));
    expect(within(ventas[1]!).getByTestId("detalle-venta").textContent).toContain("3 × MECHA VENDER 8 MM");
    expect(within(ventas[1]!).getByTestId("detalle-venta").textContent).toContain("1,5 × TORNILLO VENDER");
    expect(screen.queryByRole("button", { name: "Anular" })).toBeNull();
  });

  it("Anular lista las ventas y anula la elegida; el día se elige solo con el permiso de cualquier día", async () => {
    conPermisos("ventas.registrar", "ventas.ver", "ventas.anular");
    armar({ total: 10500, totales: { efectivo: 10500 }, ventas: [
      { id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [
        { descripcion: "MECHA VENDER 8 MM", cantidad: "3", precio_unitario: "3000" }, { descripcion: "TORNILLO VENDER", cantidad: "1.5", precio_unitario: "1000" }] },
      { id: "v2", fecha: "2026-09-14T12:30:00Z", medio_pago: "tarjeta", total: "3000", estado: "anulada", cliente: null, items: [{ descripcion: "MECHA VENDER 8 MM", cantidad: "1", precio_unitario: "3000" }] },
    ] }, "anular");
    const ventas = await screen.findAllByTestId("venta-dia");
    expect(screen.queryByTestId("dia")).toBeNull();
    expect(screen.queryByTestId("resumen-hoy")).toBeNull();
    expect(within(ventas[1]!).queryByRole("button", { name: /Anular/ })).toBeNull();
    expect(within(ventas[1]!).getByText("Anulada")).toBeTruthy();
    // 003-T005: «Anular» abre la hoja para confirmar, con el motivo de la lista y un comentario.
    fireEvent.click(within(ventas[0]!).getByRole("button", { name: /Anular la venta de \$10\.500/ }));
    const hoja = screen.getByTestId("hoja-anular");
    expect(hoja.textContent).toContain("¿Anular esta venta?");
    expect(hoja.textContent).toContain("MECHA VENDER 8 MM");
    expect([...(within(hoja).getByTestId("motivo-anular") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["Sin motivo", "Se arrepintió", "Error al cobrar", "Producto equivocado", "Devolución", "Cobrada dos veces"]);
    fireEvent.change(within(hoja).getByTestId("motivo-anular"), { target: { value: "Devolución" } });
    fireEvent.change(within(hoja).getByTestId("comentario-anular"), { target: { value: "la mecha vino fallada" } });
    fireEvent.click(within(hoja).getByTestId("confirmar-anular"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/ventas/v1/anular", { method: "POST", body: JSON.stringify({ motivo: "Devolución: la mecha vino fallada" }) }));
  });

  it("003-T005 Anular busca por producto o importe y filtra por medio de pago", async () => {
    conPermisos("ventas.registrar", "ventas.ver", "ventas.anular");
    armar({ total: 13500, totales: { efectivo: 10500, tarjeta: 3000 }, ventas: [
      { id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [{ descripcion: "MECHA VENDER 8 MM", cantidad: "3", precio_unitario: "3500" }] },
      { id: "v2", fecha: "2026-09-14T12:30:00Z", medio_pago: "tarjeta", total: "3000", estado: "confirmada", cliente: null, items: [{ descripcion: "TORNILLO VENDER", cantidad: "1", precio_unitario: "3000" }] },
    ] }, "anular");
    await screen.findAllByTestId("venta-dia");
    expect(screen.getByTestId("cuantas-ventas").textContent).toBe("2 ventas");
    fireEvent.change(screen.getByTestId("buscar-venta"), { target: { value: "tornillo" } });
    expect(screen.getAllByTestId("venta-dia")).toHaveLength(1);
    fireEvent.change(screen.getByTestId("buscar-venta"), { target: { value: "10.500" } });
    expect(screen.getAllByTestId("venta-dia")[0]!.textContent).toContain("MECHA");
    fireEvent.change(screen.getByTestId("buscar-venta"), { target: { value: "" } });
    fireEvent.click(within(screen.getByRole("group", { name: "Medio de pago" })).getByRole("button", { name: "Tarjeta" }));
    expect(screen.getAllByTestId("venta-dia")).toHaveLength(1);
    expect(screen.getByTestId("cuantas-ventas").textContent).toBe("1 venta");
  });

  it("'No llevó' anota la consulta y vacía la venta", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByRole("button", { name: "No llevó" }));
    expect(enviarOEncolar).toHaveBeenCalledWith("consulta", "POST", "/consultas", expect.objectContaining({ items: [expect.objectContaining({ producto_id: "mecha", precio_ofrecido: 3000 })] }));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("sin resultados, Enter agrega un ítem libre con su precio a mano", () => {
    const { agregar } = armar();
    agregar("bolsa de arena");
    const libre = screen.getByTestId("item");
    expect(within(libre).getByTestId("descripcion-libre")).toHaveProperty("value", "bolsa de arena");
    fireEvent.change(within(libre).getByTestId("precio-manual"), { target: { value: "1500" } });
    expect(screen.getByTestId("total").textContent).toBe("$2.000");
  });

  // RF-72: el margen elegido en la venta queda en el producto solo con «Fijar márgenes».
  it("sin el permiso de fijar márgenes, el margen vale para esta venta y no cambia el producto", () => {
    conPermisos("ventas.registrar");
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(item("TORNILLO").textContent).toContain("$1.000");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
  });

  it("sin el permiso de anular no hay pestaña Anular; con solo vender, no hay pestañas", async () => {
    conPermisos("ventas.registrar", "ventas.ver");
    const uno = armar();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Vender", "Hoy"]);
    uno.unmount();
    conPermisos("ventas.registrar");
    armar();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("sin el permiso de ver costos, el renglón no muestra el costo ni explica el precio", () => {
    conPermisos("ventas.registrar");
    const { agregar, item } = armar();
    agregar("tornillo vender");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(item("TORNILLO").textContent).toContain("$1.000");
    expect(item("TORNILLO").textContent).not.toContain("Costo");
    expect(within(item("TORNILLO")).getAllByTestId("sin-explicacion")).toHaveLength(2); // el precio por unidad y el total del renglón
  });
});
