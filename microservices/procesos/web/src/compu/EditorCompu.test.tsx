import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { lienzoFalso } from "../pruebas/preparar";
import { guardadoEnMemoria, servicio, VENTA } from "../pruebas/servicio";
import { Procesos } from "../Procesos";
import type { Puede } from "../tipos";

// La computadora (specs/011-procesos), contra el servicio de verdad con datos en memoria.
const DIBUJA: Puede = { ver: true, dibujar: true };
const MIRA: Puede = { ver: true, dibujar: false };
const PANTALLAS = ["Vender", "Vender → Cobrar", "Depósito → Inventario"];

let s: ReturnType<typeof servicio>;
let local: ReturnType<typeof guardadoEnMemoria>;
beforeEach(() => {
  s = servicio();
  local = guardadoEnMemoria();
  lienzoFalso.llamadas = [];
  lienzoFalso.xml = "";
});

function abrir(puede: Puede = DIBUJA) {
  return render(<Procesos interfaz="compu" pedir={s.como(puede)} puede={puede} pantallas={PANTALLAS} guardarLocal={local} />);
}
const elegirPaso = (id: string) => act(() => { lienzoFalso.props!.alElegir!(id); });

describe("dibujar en la computadora", () => {
  it("011-E01 abre el último proceso abierto en esta computadora, con los tres paneles plegados", async () => {
    await s.cargar("Compra a un proveedor");
    const venta = await s.cargar("Venta en el mostrador");
    local.setItem("procesos.ultimo", JSON.stringify(venta));
    abrir();
    expect(await screen.findByText("Venta en el mostrador", { selector: ".procesos-selector-nombre" })).toBeTruthy();
    expect(screen.getByTestId("procesos-panel-figuras").className).toContain("plegado");
    expect(screen.getByTestId("procesos-panel-paso").className).toContain("plegado");
    expect(screen.getByTestId("procesos-panel-pasos").className).toContain("plegado");
    expect(screen.queryByTestId("procesos-tabla")).toBeNull();
  });

  it("011-E01 quien nunca abrió uno en esta computadora ve el primero de la lista", async () => {
    await s.cargar("Compra a un proveedor");
    await s.cargar("Venta en el mostrador");
    const [primero] = (await s.como(DIBUJA)("/procesos")) as { nombre: string }[];
    abrir();
    expect(await screen.findByText(primero!.nombre, { selector: ".procesos-selector-nombre" })).toBeTruthy();
  });

  it("011-E02 apretar una figura de la izquierda empieza a arrastrarla al dibujo; elegir un paso abre su panel", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.mouseDown(screen.getByTestId("procesos-figura-decision"));
    expect(lienzoFalso.llamadas.find(([n]) => n === "empezarArrastre")?.[2]).toBe("decision");
    elegirPaso("Cobrar");
    expect(screen.getByTestId("procesos-panel-paso").className).toContain("abierto");
  });

  it("011-E03 la izquierda tiene las doce figuras con su nombre, y plegada, solo los íconos con el nombre al pasar el mouse", async () => {
    await s.cargar("Venta");
    abrir();
    const panel = await screen.findByTestId("procesos-panel-figuras");
    const figuras = within(panel).getAllByRole("button").filter((b) => b.className.includes("procesos-figura"));
    expect(figuras.map((b) => b.getAttribute("title"))).toEqual(["Inicio", "Tarea", "Tarea de una persona", "Tarea del sistema", "Decisión", "En paralelo", "Espera", "Fin", "Subproceso", "Carril", "Documento", "Nota"]);
    expect(within(panel).queryByText("Decisión")).toBeNull();
    fireEvent.click(screen.getByTestId("procesos-plegar-figuras"));
    expect(within(panel).getByText("Decisión")).toBeTruthy();
  });

  it("011-E06 el panel del paso muestra sus datos y cada cambio va al dibujo", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    await waitFor(() => expect(lienzoFalso.grafo.pasos.length).toBe(10));
    elegirPaso("Cobrar");
    expect((screen.getByTestId("procesos-paso-nombre") as HTMLInputElement).value).toBe("Cobrar");
    expect((screen.getByTestId("procesos-paso-tipo") as HTMLSelectElement).value).toBe("persona");
    expect((screen.getByTestId("procesos-paso-carril") as HTMLSelectElement).value).toBe("Vendedor");
    expect((screen.getByTestId("procesos-paso-pantalla") as HTMLSelectElement).value).toBe("Vender → Cobrar");
    expect((screen.getByTestId("procesos-paso-como") as HTMLTextAreaElement).value).toMatch(/^Efectivo viene elegido/);
    expect((screen.getByTestId("procesos-paso-sigue") as HTMLSelectElement).value).toBe("Registrar");
    fireEvent.change(screen.getByTestId("procesos-paso-nombre"), { target: { value: "Cobrar y dar el ticket" } });
    fireEvent.blur(screen.getByTestId("procesos-paso-nombre"));
    fireEvent.change(screen.getByTestId("procesos-paso-tipo"), { target: { value: "sistema" } });
    fireEvent.change(screen.getByTestId("procesos-paso-carril"), { target: { value: "Cliente" } });
    fireEvent.change(screen.getByTestId("procesos-paso-pantalla"), { target: { value: "Vender" } });
    fireEvent.change(screen.getByTestId("procesos-paso-sigue"), { target: { value: "Lista" } });
    expect(lienzoFalso.llamadas.filter(([n]) => n === "cambiar").map(([, id, c]) => [id, c])).toEqual([
      ["Cobrar", { nombre: "Cobrar y dar el ticket" }], ["Cobrar", { tipo: "sistema" }], ["Cobrar", { carril: "Cliente" }], ["Cobrar", { pantalla: "Vender" }], ["Cobrar", { sigueCon: "Lista" }],
    ]);
  });

  it("011-E07 el botón con el tacho quita el paso elegido", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    await waitFor(() => expect(lienzoFalso.grafo.pasos.length).toBe(10));
    elegirPaso("Cobrar");
    fireEvent.click(screen.getByTestId("procesos-quitar-paso"));
    expect(lienzoFalso.llamadas).toContainEqual(["quitar", "Cobrar"]);
  });

  it("011-E08 011-E09 deshacer, rehacer, acercar, alejar y ver todo van al dibujo", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    for (const nombre of ["Deshacer", "Rehacer", "Acercar", "Alejar", "Ver todo"]) fireEvent.click(screen.getByRole("button", { name: nombre }));
    expect(lienzoFalso.llamadas.map(([n]) => n)).toEqual(["deshacer", "rehacer", "acercar", "alejar", "verTodo"]);
  });

  it("011-E10 cada cambio se guarda solo, medio segundo después, y arriba dice «Guardado»", async () => {
    const id = await s.cargar("Venta", VENTA, false);
    abrir();
    await screen.findByTestId("procesos-lienzo");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    lienzoFalso.xml = VENTA.replace('name="Cobrar"', 'name="Cobrar ya"');
    act(() => { lienzoFalso.props!.alCambiar!(); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    vi.useRealTimers();
    await waitFor(() => expect(screen.getByTestId("procesos-guardado").textContent).toBe("Guardado"));
    expect(s.pedidos).toContain(`PUT /procesos/${id}/borrador`);
    const guardado = (await s.dibuja(`/procesos/${id}`)) as { borrador: { bpmn: string } };
    expect(guardado.borrador.bpmn).toContain("Cobrar ya");
  });

  it("011-E11 los pasos en orden se abren con Alt+P y muestran tipo, quién, dónde y con qué sigue", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    await waitFor(() => expect(lienzoFalso.grafo.pasos.length).toBe(10));
    fireEvent.keyDown(screen.getByTestId("procesos"), { key: "p", altKey: true });
    const tabla = screen.getByTestId("procesos-tabla");
    const fila = within(tabla).getByTestId("procesos-fila-HayStock");
    expect(within(fila).getAllByRole("cell").map((c) => c.textContent)).toEqual(["!".repeat(0) + "", "Decisión", "Vendedor", "Depósito → Inventario", "Sí: Cargar en la venta · No: Anotar el pedido"]);
    expect((within(fila).getByRole("textbox") as HTMLInputElement).value).toBe("¿Hay stock?");
    fireEvent.click(within(tabla).getByTestId("procesos-fila-Cobrar"));
    expect(lienzoFalso.llamadas).toContainEqual(["elegir", "Cobrar"]);
    const nombre = within(within(tabla).getByTestId("procesos-fila-Cobrar")).getByRole("textbox");
    fireEvent.change(nombre, { target: { value: "Cobrar al cliente" } });
    fireEvent.blur(nombre);
    expect(lienzoFalso.llamadas).toContainEqual(["cambiar", "Cobrar", { nombre: "Cobrar al cliente" }]);
  });

  it("011-E12 los paneles recuerdan cómo quedaron en esta computadora", async () => {
    await s.cargar("Venta");
    const { unmount } = abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.click(screen.getByTestId("procesos-plegar-pasos"));
    fireEvent.keyDown(screen.getByTestId("procesos"), { key: "f", altKey: true });
    unmount();
    abrir();
    await screen.findByTestId("procesos-lienzo");
    expect(screen.getByTestId("procesos-panel-pasos").className).toContain("abierto");
    expect(screen.getByTestId("procesos-panel-figuras").className).toContain("abierto");
    expect(screen.getByTestId("procesos-panel-paso").className).toContain("plegado");
  });

  it("011-E13 con el teclado: las flechas pasan de un paso a otro, Insert agrega una tarea a continuación y Enter va al nombre", async () => {
    await s.cargar("Venta");
    abrir();
    const lienzo = await screen.findByTestId("procesos-lienzo");
    await waitFor(() => expect(lienzoFalso.grafo.pasos.length).toBe(10));
    elegirPaso("Cargar");
    fireEvent.keyDown(lienzo, { key: "ArrowRight" });
    expect(lienzoFalso.llamadas.at(-1)).toEqual(["elegir", "Cobrar"]);
    fireEvent.keyDown(lienzo, { key: "Insert" });
    expect(lienzoFalso.llamadas.at(-1)).toEqual(["agregar", "tarea", "Cobrar"]);
    fireEvent.keyDown(lienzo, { key: "Enter" });
    await waitFor(() => expect(document.activeElement?.id).toBe("procesos-nombre-del-paso"));
  });

  it("011-E14 falta de inicio o de fin se avisa sobre el dibujo, sin impedir guardar", async () => {
    const sinFin = VENTA.replace(/<bpmn:endEvent[^>]*>[\s\S]*?<\/bpmn:endEvent>/g, "");
    await s.cargar("Venta", sinFin, false);
    abrir();
    expect((await screen.findByTestId("procesos-errores-generales")).textContent).toBe("Falta el fin");
  });
});

describe("los procesos", () => {
  it("011-E16 sin procesos dice qué es un proceso y ofrece «Proceso nuevo»; quien solo mira lee que no hay ninguno", async () => {
    abrir();
    const vacio = await screen.findByTestId("procesos-vacio");
    expect(vacio.textContent).toMatch(/Un proceso es cómo se hace una tarea del negocio/);
    expect(within(vacio).getByTestId("procesos-nuevo")).toBeTruthy();
    document.body.innerHTML = "";
    abrir(MIRA);
    expect((await screen.findByTestId("procesos-vacio")).textContent).toMatch(/Todavía no hay ninguno vigente/);
    expect(screen.queryByTestId("procesos-nuevo")).toBeNull();
  });

  it("011-E17 011-E18 «Proceso nuevo» pide el nombre, lo crea en borrador y lo abre; un nombre repetido dice por qué no", async () => {
    await s.cargar("Venta en el mostrador");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.click(screen.getByTestId("procesos-nuevo"));
    fireEvent.change(screen.getByTestId("procesos-nombre"), { target: { value: "venta EN EL mostrador" } });
    fireEvent.click(screen.getByTestId("procesos-aceptar-nombre"));
    expect((await screen.findByTestId("procesos-aviso")).textContent).toMatch(/Ya hay un proceso que se llama/);
    fireEvent.change(screen.getByTestId("procesos-nombre"), { target: { value: "Compra a un proveedor" } });
    fireEvent.click(screen.getByTestId("procesos-aceptar-nombre"));
    await waitFor(() => expect(screen.getByText("Compra a un proveedor", { selector: ".procesos-selector-nombre" })).toBeTruthy());
    expect(screen.getByTestId("procesos-estado").textContent).toBe("Borrador");
    expect(lienzoFalso.props!.xml).toContain("startEvent");
  });

  it("011-E19 el selector lista todos con su estado y sus pasos, con buscador, y abre el elegido", async () => {
    await s.cargar("Venta en el mostrador");
    await s.cargar("Cierre de caja", undefined, false);
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.click(screen.getByTestId("procesos-selector"));
    const menu = screen.getByTestId("procesos-menu");
    expect(within(menu).getAllByRole("menuitem").map((b) => b.textContent)).toEqual(["Cierre de cajaBorrador · 10 pasos", "Venta en el mostradorVigente · 10 pasos"]);
    fireEvent.change(within(menu).getByRole("textbox"), { target: { value: "caja" } });
    expect(within(menu).getAllByRole("menuitem")).toHaveLength(1);
    fireEvent.click(within(menu).getByRole("menuitem"));
    await waitFor(() => expect(screen.getByText("Cierre de caja", { selector: ".procesos-selector-nombre" })).toBeTruthy());
  });

  it("011-E20 borrar pregunta antes y después lo saca", async () => {
    await s.cargar("Venta en el mostrador");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.click(screen.getByTestId("procesos-selector"));
    fireEvent.click(screen.getByTestId("procesos-borrar"));
    expect(screen.getByTestId("procesos-confirmar-borrar").textContent).toMatch(/no se puede recuperar/);
    fireEvent.click(screen.getByTestId("procesos-si-borrar"));
    expect(await screen.findByTestId("procesos-vacio")).toBeTruthy();
    expect(await s.dibuja("/procesos")).toEqual([]);
  });
});

describe("borrador, vigente y versiones", () => {
  it("011-E21 011-E22 con borrador, «Marcar vigente» es el botón principal; al usarlo queda vigente", async () => {
    await s.cargar("Venta", VENTA, false);
    abrir();
    const marcar = await screen.findByTestId("procesos-marcar-vigente");
    expect(marcar.className).toContain("principal");
    fireEvent.click(marcar);
    await waitFor(() => expect(screen.getByTestId("procesos-estado").textContent).toBe("Vigente"));
    expect(screen.queryByTestId("procesos-marcar-vigente")).toBeNull();
  });

  it("011-E24 descartar el borrador vuelve al vigente", async () => {
    const id = await s.cargar("Venta");
    const p = (await s.dibuja(`/procesos/${id}`)) as { revision: number };
    await s.dibuja(`/procesos/${id}/borrador`, { method: "PUT", body: JSON.stringify({ bpmn: VENTA.replace('name="Cobrar"', 'name="Cobrar ya"'), revision: p.revision }) });
    abrir();
    expect((await screen.findByTestId("procesos-estado")).textContent).toBe("Vigente, con cambios en borrador");
    fireEvent.click(screen.getByTestId("procesos-descartar"));
    await waitFor(() => expect(screen.getByTestId("procesos-estado").textContent).toBe("Vigente"));
  });

  it("011-E23 el historial muestra cada versión con quién la hizo; una anterior se ve sin cambiar y se copia al borrador", async () => {
    const id = await s.cargar("Venta");
    const p = (await s.dibuja(`/procesos/${id}`)) as { revision: number };
    const b = (await s.dibuja(`/procesos/${id}/borrador`, { method: "PUT", body: JSON.stringify({ bpmn: VENTA.replace('name="Cobrar"', 'name="Cobrar ya"'), revision: p.revision }) })) as { revision: number };
    await s.dibuja(`/procesos/${id}/vigente`, { method: "POST", body: JSON.stringify({ revision: b.revision }) });
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.click(screen.getByTestId("procesos-selector"));
    fireEvent.click(screen.getByTestId("procesos-ver-historial"));
    const historial = await screen.findByTestId("procesos-historial");
    const versiones = await within(historial).findAllByRole("button", { name: /Carlos/ });
    expect(versiones.map((v) => v.textContent?.split(" · ")[0]?.replace(/\d.*/, ""))).toEqual(["Vigente", "Anterior"]);
    fireEvent.click(versiones[1]!);
    await within(historial).findByTestId("procesos-copiar-al-borrador");
    expect(lienzoFalso.props!.soloLectura).toBe(true);
    fireEvent.click(within(historial).getByTestId("procesos-copiar-al-borrador"));
    await waitFor(() => expect(screen.getByTestId("procesos-estado").textContent).toBe("Vigente, con cambios en borrador"));
    const ahora = (await s.dibuja(`/procesos/${id}`)) as { borrador: { bpmn: string } };
    expect(ahora.borrador.bpmn).toContain('name="Cobrar"');
  });
});

describe("exportar e importar", () => {
  it("011-E32 Exportar ofrece imagen PNG y BPMN estándar", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.click(screen.getByTestId("procesos-exportar"));
    expect(within(screen.getByTestId("procesos-menu-exportar")).getAllByRole("menuitem").map((b) => b.textContent)).toEqual([
      "Imagen (PNG)Para mandar o imprimir", "BPMN (estándar)Para abrirlo en otro programa de procesos",
    ]);
  });

  it("011-E34 BPMN (estándar) baja el archivo que guarda el dibujo, con el nombre del proceso", async () => {
    await s.cargar("Venta en el mostrador");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    const bajados: { nombre: string; tipo: string }[] = [];
    URL.createObjectURL = (b: Blob) => { bajados.push({ nombre: "", tipo: b.type }); return "blob:x"; };
    URL.revokeObjectURL = () => undefined;
    const clic = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { bajados[bajados.length - 1]!.nombre = this.download; });
    fireEvent.click(screen.getByTestId("procesos-exportar"));
    fireEvent.click(screen.getByTestId("procesos-exportar-bpmn"));
    await waitFor(() => expect(bajados).toEqual([{ nombre: "Venta en el mostrador.bpmn", tipo: "application/xml" }]));
    clic.mockRestore();
  });

  it("011-E35 Importar trae un BPMN como un proceso nuevo en borrador, con el nombre del archivo", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.change(screen.getByTestId("procesos-archivo"), { target: { files: [new File([VENTA], "Venta.bpmn", { type: "application/xml" })] } });
    await waitFor(() => expect(screen.getByText("Venta (2)", { selector: ".procesos-selector-nombre" })).toBeTruthy());
    expect(screen.getByTestId("procesos-estado").textContent).toBe("Borrador");
  });

  it("011-E36 un archivo que no es BPMN no se importa y dice por qué", async () => {
    await s.cargar("Venta");
    abrir();
    await screen.findByTestId("procesos-lienzo");
    fireEvent.change(screen.getByTestId("procesos-archivo"), { target: { files: [new File(["hola"], "notas.txt")] } });
    expect((await screen.findByTestId("procesos-aviso")).textContent).toMatch(/No es un archivo BPMN/);
    expect((await s.dibuja("/procesos")) as unknown[]).toHaveLength(1);
  });
});

describe("quién puede qué", () => {
  it("011-E38 con solo «Ver procesos» no hay figuras, Importar, Exportar, Proceso nuevo ni cambios; el dibujo es solo para mirar", async () => {
    await s.cargar("Venta");
    abrir(MIRA);
    const lienzo = await screen.findByTestId("procesos-lienzo");
    expect(lienzo.getAttribute("data-solo-lectura")).toBe("true");
    for (const id of ["procesos-panel-figuras", "procesos-importar", "procesos-exportar", "procesos-nuevo", "procesos-marcar-vigente", "procesos-guardado"]) expect(screen.queryByTestId(id)).toBeNull();
    elegirPaso("Cobrar");
    expect((screen.getByTestId("procesos-paso-nombre") as HTMLInputElement).readOnly).toBe(true);
    expect(screen.queryByTestId("procesos-quitar-paso")).toBeNull();
    fireEvent.click(screen.getByTestId("procesos-selector"));
    expect(screen.queryByTestId("procesos-borrar")).toBeNull();
  });
});

describe("sin conexión y a la vez", () => {
  it("011-E41 si otro guardó antes, se muestra cómo quedó y se avisa, sin pisar lo del otro", async () => {
    const id = await s.cargar("Venta", VENTA, false);
    abrir();
    await screen.findByTestId("procesos-lienzo");
    const p = (await s.dibuja(`/procesos/${id}`)) as { revision: number };
    await s.dibuja(`/procesos/${id}/borrador`, { method: "PUT", body: JSON.stringify({ bpmn: VENTA.replace('name="Cobrar"', 'name="Cobra Ana"'), revision: p.revision }) });
    lienzoFalso.xml = VENTA.replace('name="Cobrar"', 'name="Cobra Carlos"');
    act(() => { lienzoFalso.props!.alCambiar!(); });
    expect((await screen.findByTestId("procesos-aviso", {}, { timeout: 3000 })).textContent).toMatch(/Alguien cambió este proceso/);
    await waitFor(() => expect(lienzoFalso.props!.xml).toContain("Cobra Ana"));
  });

  it("011-E42 sin conexión se mira lo ya abierto en este dispositivo y se avisa que no se dibuja", async () => {
    await s.cargar("Venta");
    const { unmount } = abrir();
    await screen.findByTestId("procesos-lienzo");
    unmount();
    s.sinConexion(true);
    abrir();
    expect(await screen.findByTestId("procesos-sin-conexion")).toBeTruthy();
    expect(screen.getByTestId("procesos-lienzo").getAttribute("data-solo-lectura")).toBe("true");
    expect(screen.queryByTestId("procesos-panel-figuras")).toBeNull();
  });

  it("011-E44 un nombre con algo que parece código se muestra como texto", async () => {
    await s.cargar("<img src=x onerror=alert(1)>");
    abrir();
    const nombre = await screen.findByText("<img src=x onerror=alert(1)>", { selector: ".procesos-selector-nombre" });
    expect(nombre.querySelector("img")).toBeNull();
  });
});
