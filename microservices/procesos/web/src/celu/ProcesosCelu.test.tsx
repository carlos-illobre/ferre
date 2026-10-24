import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { lienzoFalso } from "../pruebas/preparar";
import { guardadoEnMemoria, servicio } from "../pruebas/servicio";
import { Procesos } from "../Procesos";
import type { Puede } from "../tipos";

// El celular (historia 4), contra el servicio de verdad con datos en memoria.
const DIBUJA: Puede = { ver: true, dibujar: true };
const MIRA: Puede = { ver: true, dibujar: false };

let s: ReturnType<typeof servicio>;
beforeEach(() => {
  s = servicio();
  lienzoFalso.llamadas = [];
});

async function abrirVenta(puede: Puede = DIBUJA, irAPasos = true) {
  const id = await s.cargar("Venta en el mostrador");
  render(<Procesos interfaz="celu" pedir={s.como(puede)} puede={puede} pantallas={["Vender → Cobrar"]} guardarLocal={guardadoEnMemoria()} />);
  fireEvent.click(await screen.findByTestId(`procesos-item-${id}`));
  await waitFor(() => expect(lienzoFalso.grafo.pasos.length).toBe(10));
  if (irAPasos) fireEvent.click(screen.getByTestId("procesos-pestana-pasos"));
  return id;
}
const tarjetas = (dentro: HTMLElement) => within(dentro).getAllByTestId(/^procesos-paso-/).map((t) => t.textContent);

describe("el celular", () => {
  it("011-E19 la lista de procesos muestra cada uno con su estado y sus pasos", async () => {
    await s.cargar("Venta en el mostrador");
    await s.cargar("Cierre de caja", undefined, false);
    render(<Procesos interfaz="celu" pedir={s.dibuja} puede={DIBUJA} pantallas={[]} />);
    const lista = await screen.findByTestId("procesos-lista");
    expect(within(lista).getAllByRole("button").map((b) => b.textContent)).toEqual(["Cierre de cajaBorrador · 10 pasos", "Venta en el mostradorVigente · 10 pasos"]);
  });

  it("011-E25 al abrir un proceso hay dos pestañas, primero «Diagrama», que está elegida, y después «Pasos»", async () => {
    await abrirVenta(DIBUJA, false);
    expect(screen.getAllByRole("tab").map((t) => t.textContent?.trim())).toEqual(["Diagrama", "Pasos"]);
    expect(screen.getByTestId("procesos-pestana-diagrama").getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("procesos-pestana-pasos").getAttribute("aria-selected")).toBe("false");
  });

  it("011-E26 cada paso es una tarjeta con su nombre y quién lo hace; después de la decisión, una rama por opción", async () => {
    await abrirVenta();
    const pasos = await screen.findByTestId("procesos-pasos-celu");
    expect(tarjetas(pasos).slice(0, 4)).toEqual(["Llega el clienteCliente", "Pide un productoCliente", "Buscar el productoVendedor", "¿Hay stock?Vendedor"]);
    const ramas = within(pasos).getAllByTestId(/^procesos-rama-/);
    expect(ramas.map((r) => [within(r).getByText(/^(Sí|No)$/).textContent, tarjetas(r)])).toEqual([
      ["Sí", ["Cargar en la ventaVendedor", "CobrarVendedor", "Registrar la venta y el stockSistema", "Venta listaSistema"]],
      ["No", ["Anotar el pedidoSistema", "Pedido anotadoSistema"]],
    ]);
  });

  it("011-E27 una tarjeta se arrastra desde el asa y se suelta en otra rama: el dibujo se rearma con esas flechas", async () => {
    await abrirVenta();
    const cobrar = screen.getByTestId("procesos-paso-Cobrar");
    const ranura = screen.getByTestId("procesos-ranura-Anotar>Anotado");
    const asa = cobrar.querySelector(".procesos-asa")!;
    document.elementsFromPoint = () => [ranura];
    fireEvent.pointerDown(asa, { clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(cobrar, { clientY: 300, clientX: 10, pointerId: 1 });
    expect(cobrar.className).toContain("moviendo");
    expect(ranura.className).toContain("activa");
    fireEvent.pointerUp(cobrar, { pointerId: 1 });
    const [nombre, cambios] = lienzoFalso.llamadas.find(([n]) => n === "aplicarFlechas")!;
    expect(nombre).toBe("aplicarFlechas");
    const unir = (cambios as { unir: { desde: string; hasta: string }[] }[]).flatMap((c) => c.unir.map((u) => `${u.desde}>${u.hasta}`));
    expect(unir).toEqual(["Cargar>Registrar", "Anotar>Cobrar", "Cobrar>Anotado"]);
  });

  it("011-E28 «Agregar un paso después» pide el tipo y el nombre y lo pone entre ese paso y el siguiente", async () => {
    await abrirVenta();
    fireEvent.click(within(screen.getByTestId("procesos-paso-Cobrar")).getByRole("button"));
    fireEvent.click(screen.getByTestId("procesos-agregar-despues"));
    const hoja = screen.getByTestId("procesos-hoja-agregar");
    fireEvent.click(within(hoja).getByRole("button", { name: "Tarea de una persona" }));
    fireEvent.change(within(hoja).getByTestId("procesos-nombre-nuevo"), { target: { value: "Dar el ticket" } });
    fireEvent.click(within(hoja).getByTestId("procesos-agregar"));
    expect(lienzoFalso.llamadas.filter(([n]) => n !== "elegir").map(([n, ...a]) => [n, ...a])).toEqual([
      ["agregar", "persona", null],
      ["cambiar", "nuevo", { nombre: "Dar el ticket" }],
      ["aplicarFlechas", [{ borrar: [expect.any(String)], unir: [{ desde: "Cobrar", hasta: "nuevo", nombre: "" }, { desde: "nuevo", hasta: "Registrar", nombre: "" }] }]],
    ]);
  });

  it("011-E29 tocar una tarjeta abre una hoja con sus datos, para cambiarlos o quitar el paso", async () => {
    await abrirVenta();
    fireEvent.click(within(screen.getByTestId("procesos-paso-Cobrar")).getByRole("button"));
    const hoja = screen.getByTestId("procesos-hoja-paso");
    expect((within(hoja).getByTestId("procesos-paso-nombre") as HTMLInputElement).value).toBe("Cobrar");
    // El botón de cerrar la cierra sin cambiar nada.
    fireEvent.click(within(hoja).getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByTestId("procesos-hoja-paso")).toBeNull();
    fireEvent.click(within(screen.getByTestId("procesos-paso-Cobrar")).getByRole("button"));
    fireEvent.click(within(screen.getByTestId("procesos-hoja-paso")).getByTestId("procesos-quitar-paso"));
    expect(lienzoFalso.llamadas.filter(([n]) => n === "aplicarFlechas" || n === "quitar").map(([n]) => n)).toEqual(["aplicarFlechas", "quitar"]);
    expect(lienzoFalso.llamadas).toContainEqual(["quitar", "Cobrar"]);
  });

  it("011-E30 «Diagrama» muestra el dibujo con acercar, alejar y ver todo, y la hoja «Agregar un paso» con las figuras, que se pliega", async () => {
    await abrirVenta();
    fireEvent.click(screen.getByTestId("procesos-pestana-diagrama"));
    const hoja = screen.getByTestId("procesos-hoja-figuras");
    // Las doce, con nombres cortos; el nombre completo, para los lectores de pantalla.
    expect(within(hoja).getAllByRole("button").filter((b) => b.className.includes("procesos-figura-celu")).map((b) => b.textContent)).toEqual(["Inicio", "Tarea", "Persona", "Sistema", "Decisión", "Paralelo", "Espera", "Fin", "Subproc.", "Carril", "Docum.", "Nota"]);
    expect(within(hoja).getByRole("button", { name: "Tarea de una persona" })).toBeTruthy();
    fireEvent.touchStart(within(hoja).getByText("Decisión"));
    expect(lienzoFalso.llamadas.find(([n]) => n === "empezarArrastre")?.[2]).toBe("decision");
    for (const nombre of ["Acercar", "Alejar", "Ver todo"]) fireEvent.click(screen.getByRole("button", { name: nombre }));
    // La hoja se pliega y se despliega tocando su título.
    fireEvent.click(screen.getByTestId("procesos-plegar-hoja"));
    expect(hoja.className).toContain("plegada");
    expect(screen.getByTestId("procesos-plegar-hoja").getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(screen.getByTestId("procesos-plegar-hoja"));
    expect(hoja.className).toContain("abierta");
    expect(lienzoFalso.llamadas.filter(([n]) => ["acercar", "alejar"].includes(n)).map(([n]) => n)).toEqual(["acercar", "alejar"]);
  });

  it("011-E32 011-E35 el menú «⋯» tiene exportar en PNG o BPMN e importar", async () => {
    await abrirVenta();
    fireEvent.click(screen.getByTestId("procesos-menu-celu"));
    const menu = screen.getByTestId("procesos-hoja-menu");
    for (const id of ["procesos-exportar-png", "procesos-exportar-bpmn", "procesos-importar", "procesos-ver-historial", "procesos-renombrar", "procesos-borrar"]) expect(within(menu).getByTestId(id)).toBeTruthy();
  });

  it("el botón de volver del celular cierra el menú «⋯», y después vuelve a la lista de procesos", async () => {
    await abrirVenta();
    fireEvent.click(screen.getByTestId("procesos-menu-celu"));
    expect(screen.getByTestId("procesos-hoja-menu")).toBeTruthy();
    await act(() => new Promise((listo) => setTimeout(listo, 10)));
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.queryByTestId("procesos-hoja-menu")).toBeNull();
    expect(screen.getByTestId("procesos-pasos-celu")).toBeTruthy();
    // Sin nada encima, volver lleva a la lista de procesos.
    act(() => { window.dispatchEvent(new PopStateEvent("popstate")); });
    expect(screen.getByTestId("procesos-lista")).toBeTruthy();
  });

  it("011-E38 quien solo mira no tiene asas, ni menú de cambios, ni hoja de figuras", async () => {
    await abrirVenta(MIRA);
    expect(document.querySelector(".procesos-asa")).toBeNull();
    fireEvent.click(screen.getByTestId("procesos-menu-celu"));
    const menu = screen.getByTestId("procesos-hoja-menu");
    expect(within(menu).getAllByRole("button").map((b) => b.textContent?.trim())).toEqual(["Historial"]);
    fireEvent.click(screen.getByTestId("procesos-pestana-diagrama"));
    expect(screen.queryByTestId("procesos-hoja-figuras")).toBeNull();
  });

  it("un proceso con un camino que vuelve atrás no se muestra como lista y manda a «Diagrama»", async () => {
    await abrirVenta();
    act(() => {
      lienzoFalso.grafo = { ...lienzoFalso.grafo, flechas: [...lienzoFalso.grafo.flechas, { id: "atras", desde: "Cobrar", hasta: "Buscar", nombre: "" }] };
      lienzoFalso.props!.alCambiar!();
    });
    expect((await screen.findByTestId("procesos-no-es-lista")).textContent).toBe("No entra en una lista: miralo en «Diagrama».");
  });
});
