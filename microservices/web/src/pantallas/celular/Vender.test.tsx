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
  (falso.clientes as unknown as { id: string; nombre: string; deuda: string }[]).push({ id: "c1", nombre: "Constructora Martínez", deuda: "0" });
  catalogo.actual = falso;
  apiFalsa.mockImplementation(async (ruta: string) => (ruta.startsWith("/ventas") ? ventas : []));
  const { unmount } = render(<ParteVender sub={sub} />);
  const busqueda = screen.queryByTestId("busqueda")!;
  const agregar = (texto: string) => { fireEvent.change(busqueda, { target: { value: texto } }); fireEvent.keyDown(busqueda, { key: "Enter" }); };
  // Los nombres se muestran como frase (decisión 127): se buscan sin importar mayúsculas.
  const item = (texto: string) => screen.getAllByTestId("item").find((i) => i.textContent?.toLowerCase().includes(texto.toLowerCase()))!;
  // La unidad está en una lista al lado de la cantidad (decisión 119).
  const unidad = (texto: string) => within(item(texto)).getByTestId("unidad");
  // Con el teclado, Enter sobre el círculo cobra (el dedo lo arrastra hasta el final).
  const cobrar = () => fireEvent.keyDown(screen.getByTestId("cobrar-pulgar"), { key: "Enter" });
  const medio = (valor: string) => { fireEvent.click(screen.getByTestId("medio")); fireEvent.click(screen.getByTestId(`medio-${valor}`)); };
  return { falso, busqueda, agregar, item, unidad, cobrar, medio, unmount };
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
    expect(item("MECHA").textContent).toContain("el kg");
  });

  it("un producto sin margen queda en ámbar con los márgenes a la vista hasta elegir uno; el margen se guarda", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(item("TORNILLO").className).toContain("falta");
    expect(within(item("TORNILLO")).getByTestId("sin-precio").textContent).toContain("Sin precio");
    expect(within(item("TORNILLO")).queryByTestId("cantidad")).toBeNull(); // el precio va antes que la cantidad
    expect(screen.getByTestId("cobro").textContent).toContain("Falta el precio de TORNILLO VENDER");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(item("TORNILLO").textContent).toContain("$1.000"); // 10 × 4 × 1,21 = 48,4 → 1000
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
    expect(screen.getByTestId("cobro").textContent).not.toContain("Falta el precio");
  });

  it("003 escenario 19: tocar el precio explica cómo se calculó, con el costo, el margen, el IVA, el redondeo y la cantidad", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "3" } });
    expect(within(item("MECHA")).getByTestId("precio").textContent).toBe("$3.000cada uno?");
    fireEvent.click(within(item("MECHA")).getByTestId("precio"));
    const pasos = within(screen.getByTestId("hoja-explicacion")).getAllByRole("listitem").map((li) => li.textContent).join(" | ");
    expect(pasos).toContain("Costo $1.000,00");
    expect(pasos).toContain("+ 100 % de margen");
    expect(pasos).toContain("+ IVA 21 %");
    expect(pasos).toContain("Redondeado para arriba a $3.000,00");
    expect(pasos).toContain("× 3 unidades = $9.000,00");
    expect(pasos).toContain("Total del renglón: $9.000,00");
  });

  it("tocar el renglón abre su hoja: los márgenes con su precio, el precio a mano solo para esta venta y quitar", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    fireEvent.click(within(item("MECHA")).getByTestId("abrir-renglon"));
    const hoja = screen.getByTestId("hoja-renglon");
    expect(within(hoja).getByRole("button", { name: "100 %" }).className).toContain("elegido");
    expect(within(hoja).getByRole("button", { name: "50 %" }).textContent).toBe("50 %$2.000");
    fireEvent.change(within(hoja).getByTestId("precio-manual"), { target: { value: "2500" } });
    // Un precio a mano que no es múltiplo de $1.000 también se redondea para arriba
    expect(screen.getByTestId("total").textContent).toBe("$2.500"); // a mano, tal cual (decisión 128)
    expect(within(item("MECHA")).getByTestId("margen").textContent).toContain("a mano");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
    fireEvent.click(within(hoja).getByTestId("quitar"));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("decisión 119: el medio es una pastilla que abre la lista de los cuatro, con su ícono; arranca en Efectivo", () => {
    const { agregar, medio } = armar();
    agregar("mecha vender");
    expect(screen.getByTestId("medio").textContent).toBe("Efectivo");
    expect(screen.getByTestId("medio").querySelector(".medio-icono.medio-efectivo")).not.toBeNull();
    fireEvent.click(screen.getByTestId("medio"));
    const lista = screen.getByRole("listbox", { name: "Cómo paga" });
    expect(within(lista).getAllByRole("option").map((o) => o.textContent)).toEqual(["Efectivo", "Mercado Pago", "Tarjeta", "Cuenta corriente"]);
    expect(within(lista).getByRole("option", { name: "Efectivo" }).getAttribute("aria-selected")).toBe("true");
    // 017-E06: cada medio con su ícono y su color, el mismo que en «Ventas de hoy».
    for (const m of ["efectivo", "mercado_pago", "tarjeta", "cuenta_corriente"]) expect(screen.getByTestId(`medio-${m}`).querySelector(`.medio-icono.medio-${m}`)).not.toBeNull();
    fireEvent.click(screen.getByTestId("medio-tarjeta"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByTestId("medio").textContent).toBe("Tarjeta");
    medio("mercado_pago");
    expect(screen.getByTestId("medio").textContent).toBe("M. Pago");
  });

  it("con cuenta corriente sin cliente pide elegirlo y avisa; el aviso se va al corregir", () => {
    const { agregar, cobrar, medio } = armar();
    agregar("mecha vender");
    medio("cuenta_corriente");
    expect(screen.getByTestId("hoja-clientes")).toBeTruthy(); // sin cliente elegido, pide elegirlo
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("cliente").textContent).toBe("Elegí el cliente");
    expect(screen.getByTestId("cliente").className).toContain("falta");
    cobrar();
    expect(screen.getByRole("alert").textContent).toContain("elegí el cliente");
    fireEvent.keyDown(window, { key: "Escape" });
    medio("efectivo");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByTestId("cliente").textContent).toBe("Cliente (opcional)");
  });

  it("003 historia 4 escenario 8: el cliente es opcional con cualquier medio y va en la venta; después vuelve a quedar sin elegir", async () => {
    const { agregar, cobrar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("cliente"));
    fireEvent.click(within(screen.getByTestId("hoja-clientes")).getByRole("button", { name: /Constructora Martínez/ }));
    expect(screen.getByTestId("cliente").textContent).toBe("Constructora Martínez");
    cobrar();
    const exito = await screen.findByTestId("exito");
    expect(exito.textContent).toContain("Efectivo · Constructora Martínez");
    const cuerpo = enviarOEncolar.mock.calls[0]![3] as { medio_pago: string; cliente_id: string | null };
    expect(cuerpo).toMatchObject({ medio_pago: "efectivo", cliente_id: "c1" });
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.getByTestId("cliente").textContent).toBe("Cliente (opcional)");
  });

  it("003 historia 4 escenario 9: se cobra deslizando hasta el final; un toque solo explica cómo, y sin productos está apagado", async () => {
    const { agregar } = armar();
    expect(screen.getByTestId("cobrar").className).toContain("apagado");
    expect((screen.getByTestId("cobrar-pulgar") as HTMLButtonElement).disabled).toBe(true);
    agregar("mecha vender");
    expect(screen.getByTestId("cobrar").textContent).toBe("Deslizá para cobrar $3.000");
    const pulgar = screen.getByTestId("cobrar-pulgar");
    fireEvent.click(pulgar, { detail: 1 });
    expect(screen.getByTestId("mensaje").textContent).toContain("Deslizá el botón hasta el final para cobrar");
    expect(enviarOEncolar).not.toHaveBeenCalled();
    // El navegador de las pruebas no tiene eventos de puntero: se arman sobre los del mouse.
    if (!("PointerEvent" in window)) (window as any).PointerEvent = class extends MouseEvent { pointerId: number; constructor(tipo: string, i: PointerEventInit = {}) { super(tipo, i); this.pointerId = i.pointerId ?? 1; } };
    // Soltarlo antes del final lo devuelve sin cobrar (el ancho, en esta prueba, lo da el navegador falso: 0).
    fireEvent.pointerDown(pulgar, { clientX: 10, pointerId: 1 });
    fireEvent.pointerUp(pulgar, { clientX: 10, pointerId: 1 });
    expect(enviarOEncolar).not.toHaveBeenCalled();
    fireEvent.pointerDown(pulgar, { clientX: 10, pointerId: 1 });
    fireEvent.pointerMove(pulgar, { clientX: 400, pointerId: 1 });
    fireEvent.pointerUp(pulgar, { clientX: 400, pointerId: 1 });
    await screen.findByTestId("exito");
    expect(enviarOEncolar).toHaveBeenCalledTimes(1);
  });

  it("003 escenario 20: Vaciar no pregunta: vacía la venta y Deshacer la devuelve igual", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    agregar("tornillo vender");
    const confirmar = vi.spyOn(window, "confirm");
    fireEvent.click(screen.getByTestId("vaciar-venta"));
    expect(confirmar).not.toHaveBeenCalled();
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
    expect(screen.getByTestId("mensaje").textContent).toContain("Vaciaste la venta");
    fireEvent.click(within(screen.getByTestId("mensaje")).getByRole("button", { name: "Deshacer" }));
    expect(screen.getAllByTestId("item").map((i) => i.querySelector("b")?.textContent)).toEqual(["Mecha vender 8 mm", "Tornillo vender"]); // como frase (decisión 127)
    confirmar.mockRestore();
  });

  it("la venta vacía lo dice y explica cómo empezar; «No llevó» y «Vaciar» no se muestran", () => {
    const { agregar } = armar();
    expect(screen.getByTestId("venta-vacia").textContent).toBe("La venta está vacíaBuscá o escaneá un producto para empezar.");
    expect(screen.queryByTestId("no-llevo")).toBeNull();
    expect(screen.queryByTestId("vaciar-venta")).toBeNull();
    expect(screen.getByTestId("titulo-venta").textContent).toContain("Esta venta0");
    agregar("mecha vender");
    expect(screen.queryByTestId("venta-vacia")).toBeNull();
    expect(screen.getByTestId("titulo-venta").textContent).toContain("Esta venta1");
  });

  it("«−» con 1 quita el renglón y deja deshacerlo; la unidad litro se escribe L", () => {
    const { agregar, item, unidad } = armar();
    agregar("mecha vender");
    expect(unidad("MECHA").textContent).toContain("L");
    fireEvent.click(within(item("MECHA")).getByRole("button", { name: "Quitar" }));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
    expect(screen.getByTestId("mensaje").textContent).toContain("Quitaste Mecha vender 8 mm");
    fireEvent.click(within(screen.getByTestId("mensaje")).getByRole("button", { name: "Deshacer" }));
    expect(screen.getAllByTestId("item")).toHaveLength(1);
  });

  it("el tacho de cada renglón lo quita y deja deshacerlo; el aviso sale abajo, sobre el cobro", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    fireEvent.click(within(item("MECHA")).getByTestId("quitar-renglon"));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
    expect(screen.getByTestId("cobro").contains(screen.getByTestId("mensaje"))).toBe(true);
    fireEvent.click(within(screen.getByTestId("mensaje")).getByRole("button", { name: "Deshacer" }));
    expect(screen.getAllByTestId("item")).toHaveLength(1);
  });

  it("003 escenario 15: si lo que se lleva supera el stock, el renglón avisa cuánto hay", () => {
    const { agregar, item, falso } = armar();
    falso.stock.set("mecha", 2);
    falso.stock.set("tornillo", 0);
    agregar("mecha vender");
    expect(within(item("MECHA")).queryByTestId("stock-no-alcanza")).toBeNull();
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "4" } });
    expect(within(item("MECHA")).getByTestId("stock-no-alcanza").textContent).toBe("Hay 2 un.: no alcanza para 4");
    agregar("tornillo vender");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(within(item("TORNILLO")).getByTestId("stock-no-alcanza").textContent).toBe("Sin stock");
  });

  it("003 escenario 18: un código que no es de ningún producto se avisa, y elegido el producto queda asociado", () => {
    const { busqueda, falso } = armar();
    fireEvent.change(busqueda, { target: { value: "7790001112223" } });
    fireEvent.keyDown(busqueda, { key: "Enter" });
    expect(screen.getByTestId("codigo-desconocido").textContent).toContain("Código 7790001112223No está en el catálogo");
    fireEvent.change(busqueda, { target: { value: "mecha vender" } });
    fireEvent.keyDown(busqueda, { key: "Enter" });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { codigo_barras: "7790001112223" });
    expect(screen.queryByTestId("codigo-desconocido")).toBeNull();
    expect(screen.getAllByTestId("item")).toHaveLength(1);
  });

  it("cobrar en efectivo manda la venta con cantidad, precio, margen y explicación, y muestra la venta registrada", async () => {
    const { agregar, cobrar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F5" }); // efectivo
    cobrar();
    const exito = await screen.findByTestId("exito");
    expect(within(exito).getByRole("heading", { name: "Venta registrada" })).toBeTruthy();
    expect(within(exito).getByTestId("exito-total").textContent).toBe("$3.000");
    expect(exito.textContent).toMatch(/Efectivo · 1 producto · \d\d:\d\d/);
    expect(within(exito).getAllByRole("button").map((b) => b.textContent)).toEqual(["Ver en Ventas de hoy", "Seguir vendiendo"]);
    expect(exito.textContent).not.toMatch(/Costo|margen|ganancia|comprobante/i);
    const cuerpo = enviarOEncolar.mock.calls[0]![3] as { medio_pago: string; cliente_id: string | null; items: { cantidad: number; precio_unitario: number; margen_aplicado: number; explicacion: { pasos: string[] } }[] };
    expect(cuerpo.medio_pago).toBe("efectivo");
    expect(cuerpo.cliente_id).toBeNull();
    expect(cuerpo.items[0]).toMatchObject({ cantidad: 1, precio_unitario: 3000, margen_aplicado: 100 });
    expect(cuerpo.items[0]!.explicacion.pasos.join(" ")).toContain("+ 100 % de margen");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.queryByTestId("exito")).toBeNull();
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
  });

  it("«Ver en Ventas de hoy» lleva a la pestaña de las ventas del día", async () => {
    const { agregar, cobrar } = armar();
    agregar("mecha vender");
    cobrar();
    fireEvent.click(await screen.findByTestId("ver-en-hoy"));
    expect(location.hash).toBe("#/vender/hoy");
  });

  it("sin conexión, dice que quedó guardada en el celular y que se envía sola", async () => {
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    const { agregar, cobrar } = armar();
    agregar("mecha vender");
    cobrar();
    const exito = await screen.findByTestId("exito");
    expect(within(exito).getByRole("heading", { name: "Guardada en este celular" })).toBeTruthy();
    expect(exito.textContent).toContain("Sin conexión: se envía sola cuando vuelva internet.");
  });

  it("decisión 120: Vender tiene dos pestañas, Vender y Ventas de hoy; la vieja dirección de Anular abre Ventas de hoy", async () => {
    const { unmount } = armar();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Vender", "Ventas de hoy"]);
    expect(screen.queryByTestId("hoy")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Ventas de hoy" }));
    expect(location.hash).toBe("#/vender/hoy");
    unmount();
    armar(ventasVacias, "anular");
    expect(await screen.findByTestId("hoy")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Ventas de hoy" }).getAttribute("aria-selected")).toBe("true");
  });

  const DOS = { total: 10500, totales: { efectivo: 10500 }, ventas: [
    { id: "v1", fecha: "2026-09-14T12:00:00Z", medio_pago: "efectivo", total: "10500", estado: "confirmada", cliente: null, items: [
      { descripcion: "MECHA VENDER 8 MM", cantidad: "3", precio_unitario: "3000" }, { descripcion: "TORNILLO VENDER", cantidad: "1.5", precio_unitario: "1000" }] },
    { id: "v2", fecha: "2026-09-14T12:30:00Z", medio_pago: "tarjeta", total: "3000", estado: "anulada", cliente: null, items: [{ descripcion: "MECHA VENDER 8 MM", cantidad: "1", precio_unitario: "3000" }] },
  ] };

  it("017 E26 E27 E28: tocar una venta abre su hoja con «Anular», que pide confirmar con el motivo de la lista y un comentario", async () => {
    conPermisos("ventas.registrar", "ventas.ver", "ventas.anular");
    armar(DOS, "hoy");
    const ventas = await screen.findAllByTestId("venta-dia");
    // La anulada no ofrece anular.
    fireEvent.click(within(ventas[0]!).getByRole("button"));
    expect(screen.getByTestId("hoja-venta").textContent).toContain("Anulada");
    expect(within(screen.getByTestId("hoja-venta")).queryByTestId("anular")).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.click(within(ventas[1]!).getByRole("button"));
    const hoja = screen.getByTestId("hoja-venta");
    expect(within(hoja).getByTestId("detalle-venta").textContent).toContain("3 × MECHA VENDER 8 MM");
    expect(within(hoja).getByTestId("detalle-venta").textContent).toContain("1,5 × TORNILLO VENDER");
    fireEvent.click(within(hoja).getByTestId("anular"));
    const confirmar = screen.getByTestId("hoja-anular");
    expect(confirmar.textContent).toContain("¿Anular esta venta?");
    expect([...(within(confirmar).getByTestId("motivo-anular") as HTMLSelectElement).options].map((o) => o.value)).toEqual(["Sin motivo", "Se arrepintió", "Error al cobrar", "Producto equivocado", "Devolución", "Cobrada dos veces"]);
    expect(within(confirmar).getByTestId("confirmar-anular").textContent).toBe("Anular · −$10.500");
    fireEvent.change(within(confirmar).getByTestId("motivo-anular"), { target: { value: "Devolución" } });
    fireEvent.change(within(confirmar).getByTestId("comentario-anular"), { target: { value: "la mecha vino fallada" } });
    fireEvent.click(within(confirmar).getByTestId("confirmar-anular"));
    await waitFor(() => expect(apiFalsa).toHaveBeenCalledWith("/ventas/v1/anular", { method: "POST", body: JSON.stringify({ motivo: "Devolución: la mecha vino fallada" }) }));
    await waitFor(() => expect(screen.queryByTestId("hoja-venta")).toBeNull());
  });

  it("017 E26: sin el permiso de anular, la hoja de la venta no tiene «Anular»", async () => {
    conPermisos("ventas.registrar", "ventas.ver");
    armar(DOS, "hoy");
    const ventas = await screen.findAllByTestId("venta-dia");
    fireEvent.click(within(ventas[1]!).getByRole("button"));
    expect(within(screen.getByTestId("hoja-venta")).queryByTestId("anular")).toBeNull();
  });

  it("017 E30: sin conexión, anular dice que hace falta internet y la venta queda como estaba", async () => {
    conPermisos("ventas.registrar", "ventas.ver", "ventas.anular");
    armar(DOS, "hoy");
    const ventas = await screen.findAllByTestId("venta-dia");
    apiFalsa.mockImplementation(async (ruta: string) => { if (ruta.endsWith("/anular")) throw new TypeError("Failed to fetch"); return DOS; });
    fireEvent.click(within(ventas[1]!).getByRole("button"));
    fireEvent.click(screen.getByTestId("anular"));
    fireEvent.click(screen.getByTestId("confirmar-anular"));
    expect((await within(screen.getByTestId("hoja-anular")).findByRole("alert")).textContent).toContain("para anular hace falta internet");
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
    expect(screen.getByTestId("total").textContent).toBe("$1.500"); // el ítem libre es precio a mano: tal cual (decisión 128)
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

  it("con solo ver las ventas o solo anular hay dos pestañas; con solo vender, no hay pestañas", async () => {
    conPermisos("ventas.registrar", "ventas.anular");
    const uno = armar();
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Vender", "Ventas de hoy"]);
    uno.unmount();
    conPermisos("ventas.registrar");
    armar();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("sin el permiso de ver costos, el renglón no muestra el costo ni explica el precio", () => {
    conPermisos("ventas.registrar");
    const { agregar, item } = armar();
    agregar("tornillo vender");
    expect(item("TORNILLO").textContent).toContain("elegí margen");
    fireEvent.click(within(item("TORNILLO")).getByRole("button", { name: "300 %" }));
    expect(item("TORNILLO").textContent).toContain("$1.000");
    expect(item("TORNILLO").textContent).not.toContain("costo");
    expect(within(item("TORNILLO")).queryByTestId("precio")).toBeNull();
  });
});
