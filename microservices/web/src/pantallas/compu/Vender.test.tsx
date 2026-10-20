/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { catalogoFalso, producto } from "../../pruebas/catalogo-falso";

const catalogo = vi.hoisted(() => ({ actual: null as unknown as { useCatalogoFalso: () => unknown } }));
vi.mock("../../catalogo", () => ({ useCatalogo: () => catalogo.actual.useCatalogoFalso() }));
vi.mock("../../plataforma/camara/Escaner", () => ({ Escaner: () => null, hayCamara: () => false }));
vi.mock("../../puesto", async (original) => ({ ...(await original<typeof import("../../puesto")>()), enviarCodigoAlPuesto: vi.fn(), escucharPuesto: vi.fn(() => () => undefined), puestoRemoto: () => null, puestoLocal: () => null, guardarPuestoLocal: vi.fn() }));
const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
const enviarOEncolar = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<{ encolado: boolean }>>(async () => ({ encolado: false })));
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: (...a: unknown[]) => enviarOEncolar(...a), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { Vender } from "./Vender";

function armar(ventas: unknown = { ventas: [], totales: {}, total: 0 }, ultimos: string[] = []) {
  const falso = catalogoFalso([
    producto({ id: "mecha", descripcion: "MECHA VENDER 8 MM", costo_neto: "1000", margen_elegido: 100 }),
    producto({ id: "tornillo", descripcion: "TORNILLO VENDER", costo_neto: "10" }),
  ]);
  (falso as unknown as { clientes: unknown[] }).clientes = [{ id: "c1", nombre: "Constructora Uno", telefono: null, cuenta_corriente: true, deuda: "5000" }];
  catalogo.actual = { useCatalogoFalso: () => ({ ...(falso.useCatalogoFalso() as object), clientes: (falso as unknown as { clientes: unknown[] }).clientes }) };
  apiFalsa.mockImplementation(async (ruta: string) => (ruta === "/ventas/ultimos-productos" ? { productos: ultimos } : ruta.startsWith("/ventas") ? ventas : []));
  render(<Vender />);
  const busqueda = screen.getByTestId("busqueda");
  const agregar = (texto: string) => { fireEvent.change(busqueda, { target: { value: texto } }); fireEvent.keyDown(busqueda, { key: "Enter" }); };
  // Los nombres se muestran como frase (decisión 127): se buscan sin importar mayúsculas.
  const item = (texto: string) => screen.getAllByTestId("item").find((i) => i.textContent?.toLowerCase().includes(texto.toLowerCase()))!;
  return { falso, busqueda, agregar, item };
}

describe("Vender (v2)", () => {
  beforeEach(() => { apiFalsa.mockReset(); enviarOEncolar.mockClear(); });

  it("la venta nueva dice qué hacer para empezar", () => {
    armar();
    expect(screen.getByText("La venta está vacía")).toBeTruthy();
    expect(screen.getByTestId("cobrar").hasAttribute("disabled")).toBe(true);
  });

  it("Enter agrega, el precio se redondea para arriba a $1.000 y el total suma", () => {
    const { agregar, item } = armar();
    agregar("mecha vender"); // 1000 × 2 × 1,21 = 2420 → 3000
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "3" } });
    expect(screen.getByTestId("total").textContent).toBe("$9.000");
  });

  it("la cantidad no deja ceros a la izquierda y por unidad es entera", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.change(cantidad, { target: { value: "2.7" } });
    expect(cantidad.value).toBe("2");
    fireEvent.change(cantidad, { target: { value: "" } });
    expect(cantidad.value).toBe("");
    fireEvent.blur(cantidad);
    expect(cantidad.value).toBe("1");
  });

  it("un renglón sin precio ya muestra los márgenes; elegir uno lo guarda en el producto y le pone precio", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(within(item("TORNILLO")).getByTestId("sin-precio")).toBeTruthy();
    expect(screen.getByTestId("faltan-precios").textContent).toBe("Falta 1 precio"); // arriba, al lado de la cuenta
    expect(within(screen.getByTestId("cobro")).queryByText(/Falta/)).toBeNull();
    fireEvent.click(within(item("TORNILLO")).getByTestId("margen-300"));
    expect(screen.queryByTestId("faltan-precios")).toBeNull();
    expect(falso.actualizarProducto).toHaveBeenCalledWith("tornillo", { margen_elegido: 300 });
    expect(within(item("TORNILLO")).queryByTestId("sin-precio")).toBeNull();
    expect(screen.getByTestId("total").textContent).toBe("$1.000");
  });

  it("el precio a mano vale para esta venta y no cambia el producto", () => {
    const { agregar, item, falso } = armar();
    agregar("tornillo vender");
    expect(within(item("TORNILLO")).queryByTestId("precio-manual")).toBeNull(); // la caja se habilita con su botón
    fireEvent.click(within(item("TORNILLO")).getByTestId("habilitar-precio-manual"));
    fireEvent.change(screen.getByTestId("precio-manual"), { target: { value: "2500" } }); // en la ventana «Precio a mano»
    fireEvent.click(screen.getByTestId("poner-precio"));
    // Se cobra tal cual, sin aviso (003 historia 1, escenario 2; decisiones 128 y 132).
    expect(screen.getByTestId("total").textContent).toBe("$2.500");
    expect(screen.queryByText(/múltiplo/)).toBeNull();
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
  });

  it("cobrar sin precio avisa en el cobro y el aviso se va al corregir; Efectivo viene elegido", () => {
    const { agregar, item } = armar();
    agregar("tornillo vender");
    expect(screen.getByTestId("medio-efectivo").getAttribute("aria-checked")).toBe("true");
    // 017-E06: cada medio con su ícono y su color, el mismo que en «Hoy».
    for (const m of ["efectivo", "mercado_pago", "tarjeta", "cuenta_corriente"]) expect(screen.getByTestId(`medio-${m}`).querySelector(`.medio-icono.medio-${m}`)).not.toBeNull();
    fireEvent.click(screen.getByTestId("cobrar"));
    expect(screen.getByTestId("error-cobro").textContent).toContain("Hay productos sin precio");
    expect(enviarOEncolar).not.toHaveBeenCalled();
    fireEvent.click(within(item("TORNILLO")).getByTestId("margen-100"));
    expect(screen.queryByTestId("error-cobro")).toBeNull();
  });

  it("la venta vacía muestra los últimos productos vendidos, que se agregan con un clic; sin «No llevó» ni «Vaciar» (decisiones 126 y 131)", async () => {
    armar(undefined, ["mecha"]); // los productos de las últimas ventas, del servidor (decisión 133)
    expect(screen.getByTestId("venta-vacia").textContent).toContain("La venta está vacía");
    expect(screen.queryByTestId("no-llevo")).toBeNull();
    expect(screen.queryByTestId("vaciar-venta")).toBeNull();
    const ultimos = await screen.findByTestId("sugeridos-ultimos");
    expect(ultimos.textContent).toContain("Mecha vender 8 mm$3.000");
    fireEvent.click(within(ultimos).getByRole("button"));
    expect(screen.getAllByTestId("item")).toHaveLength(1);
    expect(screen.queryByTestId("sugeridos-ultimos")).toBeNull(); // con la venta empezada, la lista ocupa su lugar
    expect(screen.getByTestId("no-llevo")).toBeTruthy();
  });

  it("dicen lo mismo que el celular: los medios de pago y los avisos salen de los textos compartidos", async () => {
    const { MEDIOS, TEXTOS } = await import("../textos");
    const { agregar } = armar();
    agregar("mecha vender");
    // En la barra va el nombre corto (no entra el largo); el largo lo dice al pasar el mouse y al lector.
    for (const m of MEDIOS) {
      expect(screen.getByTestId(`medio-${m.valor}`).textContent).toContain(m.corto);
      expect(screen.getByTestId(`medio-${m.valor}`).getAttribute("title")).toBe(m.nombre);
    }
    fireEvent.click(screen.getByTestId("no-llevo"));
    expect((await screen.findByTestId("mensaje")).textContent).toBe(TEXTOS.vender.noLlevo.largo);
  });

  it("el panel de la derecha se oculta con F1 o su botón, deja una pestaña para volver a abrirlo y lo recuerda", () => {
    localStorage.removeItem("ferre.panel");
    armar();
    expect(screen.getByTestId("panel")).toBeTruthy();
    fireEvent.click(screen.getByTestId("ocultar-panel"));
    expect(screen.queryByTestId("panel")).toBeNull();
    expect(localStorage.getItem("ferre.panel")).toBe("oculto");
    fireEvent.click(screen.getByTestId("abrir-panel"));
    expect(screen.getByTestId("panel")).toBeTruthy();
    fireEvent.keyDown(window, { key: "F1" });
    expect(screen.queryByTestId("panel")).toBeNull();
    fireEvent.keyDown(window, { key: "F1" });
    expect(screen.getByTestId("panel")).toBeTruthy();
  });

  it("el tacho quita el renglón con Deshacer; el total va dentro de «Cobrar»", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    expect(screen.getByTestId("cobrar").textContent).toContain("$3.000");
    fireEvent.click(within(item("MECHA")).getByTestId("quitar-renglon"));
    expect(screen.queryAllByTestId("item")).toHaveLength(0);
    fireEvent.click(within(screen.getByTestId("mensaje")).getByText("Deshacer"));
    expect(screen.getAllByTestId("item")).toHaveLength(1);
  });

  it("el cliente es opcional con cualquier medio y, elegido, muestra sus iniciales en vez del ícono", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F9" });
    fireEvent.click(within(screen.getByTestId("hoja-clientes")).getByTestId("cliente-opcion"));
    expect(screen.getByTestId("medio-efectivo").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByTestId("cliente").textContent).toContain("CUConstructora Uno");
  });

  it("el tacho va a la derecha del precio; el precio por unidad sale una vez y «Precio a mano» abre su ventana", () => {
    const { agregar, item, falso } = armar();
    agregar("mecha vender");
    const renglon = item("MECHA");
    const tacho = within(renglon).getByTestId("quitar-renglon");
    const subtotal = within(renglon).getByTestId("subtotal");
    expect(subtotal.compareDocumentPosition(tacho) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy(); // decisión 132
    // «Precio a mano» abre su ventana; puesto, el lugar del precio dice «A mano $5.000» y el de antes no se repite.
    fireEvent.click(within(renglon).getByTestId("habilitar-precio-manual"));
    fireEvent.change(screen.getByTestId("precio-manual"), { target: { value: "5000" } });
    fireEvent.click(screen.getByTestId("poner-precio"));
    expect(within(renglon).getByTestId("habilitar-precio-manual").textContent).toBe("A mano $5.000");
    expect(within(renglon).queryByText("Precio")).toBeNull();
    expect(screen.getByTestId("total").textContent).toBe("$5.000");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
    // Elegir un margen vuelve al precio del margen.
    fireEvent.click(within(renglon).getByTestId("margen-100"));
    expect(screen.getByTestId("total").textContent).toBe("$3.000");
  });

  it("«De dónde sale» muestra la cuenta en filas, cada paso con su importe, y el total del renglón", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    fireEvent.change(within(item("MECHA")).getByTestId("cantidad"), { target: { value: "4" } });
    const filas = [...screen.getByTestId("de-donde-sale").querySelectorAll("dl > div")].map((f) => f.textContent);
    expect(filas).toEqual(["Costo · Proveedor uno, lista del 11/08$1.000,00", "+ margen 100 %$2.000", "+ IVA 21 %$2.420", "Precio, para arriba a $1.000$3.000", "× 4$12.000"]);
    expect(screen.getByTestId("de-donde-sale").textContent).toContain("Total del renglón$12.000");
  });

  it("F4 es «No llevó» (Esc queda para la búsqueda)", async () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F4" });
    expect((await screen.findByTestId("mensaje")).textContent).toContain("No llevó");
  });

  it("lo que agrega el celular se marca «Llegó del celular» un momento", async () => {
    const { marcarLlegado } = await import("../../negocio/ventas/llegados-del-celular");
    const { agregar, item } = armar();
    agregar("mecha vender");
    act(() => marcarLlegado(item("MECHA").dataset.clave!));
    expect(within(item("MECHA")).getByTestId("llego-del-celular").textContent).toBe("Llegó del celular");
  });

  it("la cantidad sube y baja con las flechas del teclado", () => {
    const { agregar, item } = armar();
    agregar("mecha vender");
    const cantidad = within(item("MECHA")).getByTestId("cantidad") as HTMLInputElement;
    fireEvent.keyDown(cantidad, { key: "ArrowUp" });
    fireEvent.keyDown(cantidad, { key: "ArrowUp" });
    expect(cantidad.value).toBe("3");
    fireEvent.keyDown(cantidad, { key: "ArrowDown" });
    expect(cantidad.value).toBe("2");
  });

  it("cuenta corriente pide el cliente en el mismo gesto y el éxito lo nombra", async () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F8" });
    const hoja = screen.getByTestId("hoja-clientes");
    expect(hoja.textContent).toContain("debe $5.000");
    fireEvent.click(within(hoja).getByTestId("cliente-opcion"));
    expect(screen.getByTestId("cliente").textContent).toContain("Constructora Uno");
    fireEvent.keyDown(window, { key: "F2" });
    await waitFor(() => expect(screen.getByTestId("exito")).toBeTruthy());
    expect(screen.getByTestId("exito").textContent).toContain("Cuenta corriente · Constructora Uno");
    const [tipo, metodo, ruta, cuerpo] = enviarOEncolar.mock.calls[0]!;
    expect([tipo, metodo, ruta]).toEqual(["venta", "POST", "/ventas"]);
    expect(cuerpo).toMatchObject({ medio_pago: "cuenta_corriente", cliente_id: "c1", items: [{ producto_id: "mecha", cantidad: 1, precio_unitario: 3000, margen_aplicado: 100 }] });
  });

  it("con la venta armada, F5 y el Enter final la cobran y dejan la venta vacía", async () => {
    const { agregar, busqueda } = armar();
    agregar("mecha vender");
    fireEvent.keyDown(window, { key: "F5" });
    fireEvent.keyDown(busqueda, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("Venta registrada"));
    expect(screen.getByTestId("exito").textContent).toContain("$3.000");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(screen.queryByTestId("item")).toBeNull();
  });

  it("sin conexión la venta queda guardada en el dispositivo y lo dice", async () => {
    enviarOEncolar.mockResolvedValueOnce({ encolado: true });
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("medio-efectivo"));
    fireEvent.click(screen.getByTestId("cobrar"));
    await waitFor(() => expect(screen.getByTestId("exito").textContent).toContain("guardada en este dispositivo"));
  });

  it("«No llevó» anota la consulta con lo ofrecido y vacía la venta", () => {
    const { agregar } = armar();
    agregar("mecha vender");
    fireEvent.click(screen.getByTestId("no-llevo"));
    expect(enviarOEncolar).toHaveBeenCalledWith("consulta", "POST", "/consultas", expect.objectContaining({ items: [expect.objectContaining({ producto_id: "mecha", precio_ofrecido: 3000 })] }));
    expect(screen.queryByTestId("item")).toBeNull();
    expect(screen.getByTestId("mensaje").textContent).toContain("No llevó");
  });

  it("lo que no está en ninguna lista se agrega como ítem libre", () => {
    const { agregar } = armar();
    agregar("cosa rara");
    expect((screen.getByTestId("descripcion-libre") as HTMLInputElement).value).toBe("cosa rara");
  });
});
