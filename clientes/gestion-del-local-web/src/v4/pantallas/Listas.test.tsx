/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";

const apiFalsa = vi.hoisted(() => vi.fn<(...a: any[]) => Promise<any>>());
vi.mock("../../api", async (original) => ({ ...(await original<typeof import("../../api")>()), api: (...a: unknown[]) => apiFalsa(...a) }));
vi.mock("../../cola", () => ({ enviarOEncolar: vi.fn(async () => ({ encolado: false })), enviarPendientes: vi.fn(async () => 0), pendientes: vi.fn(async () => []), alCambiarLaCola: () => () => undefined }));

import { ErrorApi } from "../../api";
import { dibujar } from "../pruebas";
import { ESPERA_DEL_AVANCE, Listas } from "./Listas";

const dia = (atras: number) => { const d = new Date(Date.now() - atras * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const enPalabras = (clave: string) => `${clave.slice(8)}/${clave.slice(5, 7)}/${clave.slice(0, 4)}`;
const resumen = (extra: object = {}) => ({ leidas: 7096, salteadas: 0, nuevos: 12, modificados: 1340, sin_cambio: 5744, dados_de_baja: 0, variacion_promedio: 8.2, ...extra });

type Estado = { proveedores: any[]; listas: any[]; subidas: FormData[]; alSubir: (cuerpo: FormData) => any; estadoDeLista: () => any; filas: any[] };
let servidor: Estado;

function reiniciar() {
  const proveedores = [
    { id: "pv-comodo", nombre: "Comodo", precios_incluyen_iva: false, descuento_general: "0.25", descuento_contado: "0", lector: "comodo", activo: true },
    { id: "pv-tresge", nombre: "Tresge", precios_incluyen_iva: false, descuento_general: "0", descuento_contado: "0", lector: null, activo: true },
    { id: "pv-erpa", nombre: "Erpa", precios_incluyen_iva: false, descuento_general: "0", descuento_contado: "0", lector: null, activo: true },
    { id: "pv-baja", nombre: "Dado de baja", precios_incluyen_iva: false, descuento_general: "0", descuento_contado: "0", lector: null, activo: false },
  ];
  const lista = (id: string, proveedor: (typeof proveedores)[number], atras: number, estado: string, r = resumen()) => ({
    id, archivo_nombre: `${id}.xlsx`, fecha_lista: dia(atras), estado, resumen: r, avisos: [], importada_en: estado === "aplicada" ? new Date(Date.now() - atras * 86400000).toISOString() : null,
    creado_en: new Date(Date.now() - atras * 86400000).toISOString(), proveedor_id: proveedor.id, proveedor: proveedor.nombre,
  });
  const leida = { id: "l-nueva", proveedor: "Comodo", fecha_lista: dia(1), resumen: resumen({ salteadas: 2, dados_de_baja: 3 }), avisos: ["La planilla trae 38 ofertas con vencimiento."], salteadas: [{ fila: 14, motivo: "no tiene precio", contenido: [] }, { fila: 20, motivo: "no tiene código", contenido: [] }] };
  servidor = {
    proveedores,
    listas: [lista("l-pend", proveedores[1]!, 2, "pendiente", resumen({ nuevos: 3, modificados: 96, sin_cambio: 1120 })), lista("l-1", proveedores[0]!, 10, "aplicada"), lista("l-2", proveedores[1]!, 60, "aplicada"), lista("l-3", proveedores[0]!, 90, "descartada")],
    subidas: [],
    alSubir: () => leida,
    estadoDeLista: () => ({ estado: "aplicada", resumen: resumen() }),
    filas: [
      { codigo_proveedor: "600123", descripcion: "Mecha 6 mm madera", marca: "Bosch", costo_neto: "1100", costo_anterior: "1000", explicacion: ["Precio de lista: $1.466,67", "Menos el 25 %"] },
      { codigo_proveedor: "312055", descripcion: "Cinta aisladora", marca: "3M", costo_neto: "380", costo_anterior: "400", explicacion: [] },
      { codigo_proveedor: "600410", descripcion: "Mecha escalonada", marca: "Irwin", costo_neto: "21480", costo_anterior: null, explicacion: [] },
    ],
  };
  apiFalsa.mockImplementation(async (ruta: string, opciones: RequestInit = {}) => {
    const metodo = opciones.method ?? "GET";
    if (ruta === "/proveedores" && metodo === "GET") return servidor.proveedores;
    if (ruta === "/proveedores" && metodo === "POST") {
      const cuerpo = JSON.parse(String(opciones.body));
      if (servidor.proveedores.some((p) => p.nombre.toLowerCase() === cuerpo.nombre.toLowerCase())) throw new ErrorApi(409, `Ya existe un proveedor llamado ${cuerpo.nombre}`);
      servidor.proveedores.push({ id: "pv-nuevo", activo: true, ...cuerpo });
      return { ok: true };
    }
    if (ruta === "/listas" && metodo === "GET") return servidor.listas;
    if (ruta === "/listas" && metodo === "POST") { servidor.subidas.push(opciones.body as FormData); return servidor.alSubir(opciones.body as FormData); }
    if (/\/filas$/.test(ruta)) return { total: 7096, filas: servidor.filas };
    if (/\/(aplicar|descartar)$/.test(ruta)) return undefined;
    if (/^\/listas\/[^/]+$/.test(ruta)) return servidor.estadoDeLista();
    throw new Error(`sin ruta ${metodo} ${ruta}`);
  });
}

const planilla = (nombre = "comodo-octubre.xlsx") => new File(["x"], nombre);
async function abrir() {
  dibujar(<Listas />, "listas");
  await waitFor(() => expect(screen.getByTestId("zona-de-carga")).toBeTruthy());
}
const subir = (archivo = planilla()) => fireEvent.change(screen.getByTestId("archivo"), { target: { files: [archivo] } });
const llamadas = (ruta: string, metodo = "POST") => apiFalsa.mock.calls.filter(([r, o]) => r === ruta && (o?.method ?? "GET") === metodo);

describe("Listas de precios (v4)", () => {
  beforeEach(() => { vi.restoreAllMocks(); apiFalsa.mockReset(); reiniciar(); });
  afterEach(() => { vi.useRealTimers(); });

  it("la portada muestra cada proveedor con su última lista aplicada y cuál está vieja", async () => {
    dibujar(<Listas />, "listas");
    expect(screen.getByTestId("progreso").textContent).toContain("Buscando las listas");
    await waitFor(() => expect(screen.getAllByTestId("proveedor")).toHaveLength(3)); // el dado de baja no aparece
    const proveedor = (nombre: string) => screen.getAllByTestId("proveedor").find((p) => p.textContent?.includes(nombre))!;
    expect(proveedor("Comodo").textContent).toContain(`Última lista: ${enPalabras(dia(10))}`);
    expect(proveedor("Comodo").textContent).toContain("Hace 10 días");
    expect(within(proveedor("Tresge")).getByTestId("lista-vieja").textContent).toBe("Vieja: hace 2 meses");
    expect(proveedor("Erpa").textContent).toContain("Todavía sin lista");
  });

  it("las últimas cargas dicen cómo quedó cada una", async () => {
    await abrir();
    const cargas = screen.getAllByTestId("carga");
    expect(cargas).toHaveLength(4);
    expect(cargas[0]!.textContent).toContain(`Tresge, lista del ${enPalabras(dia(2))}`);
    expect(cargas[0]!.textContent).toContain("Sin revisar");
    expect(cargas[1]!.textContent).toContain("Hace 10 días · 1.352 precios actualizados");
    expect(cargas[1]!.textContent).toContain("Aplicada");
    expect(cargas[3]!.textContent).toContain("Descartada");
  });

  it("subir la planilla la lee y muestra qué cambia, con los números y ejemplos reales", async () => {
    await abrir();
    let soltar: (v: unknown) => void = () => undefined;
    servidor.alSubir = () => new Promise((r) => { soltar = r; });
    subir();
    await waitFor(() => expect(screen.getByTestId("progreso").textContent).toContain("Leyendo comodo-octubre.xlsx"));
    const cuerpo = servidor.subidas[0]!;
    expect((cuerpo.get("archivo") as File).name).toBe("comodo-octubre.xlsx");
    expect(cuerpo.get("proveedor_id")).toBeNull();
    await act(async () => { soltar({ id: "l-nueva", proveedor: "Comodo", fecha_lista: dia(1), resumen: resumen({ salteadas: 2, dados_de_baja: 3 }), avisos: ["La planilla trae 38 ofertas con vencimiento."], salteadas: [{ fila: 14, motivo: "no tiene precio", contenido: [] }] }); });

    const revision = await screen.findByTestId("revision");
    expect(revision.textContent).toContain(`Comodo, lista del ${enPalabras(dia(1))}`);
    const numeros = screen.getByTestId("resumen").textContent!;
    expect(numeros).toContain("12productos nuevos");
    expect(numeros).toContain("1.340cambian de precio");
    expect(numeros).toContain("Suben 8,2 % en promedio");
    expect(numeros).toContain("5.744quedan igual");
    expect(screen.getByTestId("aviso-de-lectura").textContent).toContain("38 ofertas");
    expect(screen.getByTestId("fuera-de-la-lista").textContent).toContain("2 filas de la planilla no se pudieron leer: fila 14 (no tiene precio) y 1 más");
    expect(screen.getByTestId("fuera-de-la-lista").textContent).toContain("3 productos que estaban en la lista anterior ya no aparecen");
    expect(screen.getByTestId("aplicar").textContent).toBe("Aplicar 1.352 precios");

    const ejemplos = await screen.findAllByTestId("ejemplo");
    expect(apiFalsa).toHaveBeenCalledWith("/listas/l-nueva/filas");
    expect(ejemplos[0]!.textContent).toContain("Costo: de $1.000,00 a$1.100,00");
    expect(ejemplos[0]!.textContent).toContain("Sube 10 %");
    expect(ejemplos[1]!.textContent).toContain("Baja 5 %");
    expect(ejemplos[2]!.textContent).toContain("Nuevo");
    fireEvent.click(within(ejemplos[0]!).getByTestId("explicacion"));
    expect(screen.getByTestId("hoja-explicacion").textContent).toContain("Menos el 25 %");
  });

  it("también se puede arrastrar la planilla", async () => {
    await abrir();
    const zona = screen.getByTestId("zona-de-carga");
    fireEvent.dragOver(zona);
    expect(zona.textContent).toContain("Soltala acá");
    fireEvent.drop(zona, { dataTransfer: { files: [planilla("tresge.xls")] } });
    await screen.findByTestId("revision");
    expect((servidor.subidas[0]!.get("archivo") as File).name).toBe("tresge.xls");
  });

  it("si no reconoce el proveedor, lo pregunta y lee de nuevo el mismo archivo", async () => {
    await abrir();
    servidor.alSubir = (cuerpo) => { if (!cuerpo.get("proveedor_id")) throw new ErrorApi(422, "No reconocí de qué proveedor es la planilla. Elegilo a mano."); return { id: "l-nueva", proveedor: "Tresge", fecha_lista: dia(1), resumen: resumen(), avisos: [], salteadas: [] }; };
    subir(planilla("desconocido.xlsx"));
    const pregunta = await screen.findByTestId("falta-proveedor");
    expect(pregunta.textContent).toContain("No se reconoce de quién es desconocido.xlsx");
    const opciones = screen.getAllByTestId("proveedor-opcion");
    expect(opciones.map((o) => o.textContent)).toEqual(["COComodo", "TRTresge", "ERErpa"]);
    fireEvent.click(opciones[1]!);
    const revision = await screen.findByTestId("revision");
    expect(revision.textContent).toContain("Tresge, lista del");
    expect(servidor.subidas).toHaveLength(2);
    expect(servidor.subidas[1]!.get("proveedor_id")).toBe("pv-tresge");
    expect((servidor.subidas[1]!.get("archivo") as File).name).toBe("desconocido.xlsx");
  });

  it("si es de un proveedor nuevo, se lo agrega ahí mismo y sigue la lectura", async () => {
    await abrir();
    servidor.alSubir = (cuerpo) => { if (!cuerpo.get("proveedor_id")) throw new ErrorApi(422, "No reconocí de qué proveedor es la planilla. Elegilo a mano."); return { id: "l-nueva", proveedor: "Ferretera del Sur", fecha_lista: dia(1), resumen: resumen(), avisos: [], salteadas: [] }; };
    subir();
    await screen.findByTestId("falta-proveedor");
    fireEvent.click(screen.getByTestId("agregar-proveedor"));
    fireEvent.change(screen.getByTestId("nombre-del-proveedor"), { target: { value: "Ferretera del Sur" } });
    fireEvent.click(screen.getByTestId("guardar-proveedor"));
    const revision = await screen.findByTestId("revision");
    expect(revision.textContent).toContain("Ferretera del Sur, lista del");
    expect(servidor.subidas[1]!.get("proveedor_id")).toBe("pv-nuevo");
  });

  it("si la planilla no dice la fecha, la pide (sin fecha no sigue) y lee de nuevo", async () => {
    await abrir();
    servidor.alSubir = (cuerpo) => { if (!cuerpo.get("fecha_lista")) throw new ErrorApi(422, "La planilla no dice su fecha: indicá la fecha de la lista"); return { id: "l-nueva", proveedor: "Comodo", fecha_lista: String(cuerpo.get("fecha_lista")), resumen: resumen(), avisos: [], salteadas: [] }; };
    subir(planilla("sin-fecha.xlsx"));
    const pregunta = await screen.findByTestId("falta-fecha");
    expect(pregunta.textContent).toContain("La planilla sin-fecha.xlsx no lo dice");
    fireEvent.click(screen.getByTestId("seguir"));
    expect(pregunta.textContent).toContain("Poné la fecha de la lista para seguir.");
    expect(servidor.subidas).toHaveLength(1);
    fireEvent.change(screen.getByTestId("elegir-fecha"), { target: { value: dia(3) } });
    fireEvent.click(screen.getByTestId("seguir"));
    const revision = await screen.findByTestId("revision");
    expect(revision.textContent).toContain(`Comodo, lista del ${enPalabras(dia(3))}`);
    expect(servidor.subidas[1]!.get("fecha_lista")).toBe(dia(3));
  });

  it("un archivo que no es Excel no se sube; uno que el servidor no puede leer muestra el motivo", async () => {
    await abrir();
    subir(planilla("presupuesto.pdf"));
    expect(screen.getByTestId("error-de-carga").textContent).toContain("presupuesto.pdf no es una planilla de Excel");
    expect(servidor.subidas).toHaveLength(0);
    servidor.alSubir = () => { throw new ErrorApi(422, "No se pudo leer la planilla: no encontré la columna de precios."); };
    subir(planilla("roto.xlsx"));
    await waitFor(() => expect(screen.getByTestId("error-de-carga").textContent).toContain("roto.xlsx: No se pudo leer la planilla: no encontré la columna de precios. No se guardó nada."));
    expect(screen.getByTestId("elegir-archivo").textContent).toBe("Elegir otra planilla");
    fireEvent.click(screen.getByTestId("volver"));
    expect(screen.getByTestId("zona-de-carga")).toBeTruthy();
  });

  it("si se corta internet al subir, deja probar de nuevo con el mismo archivo", async () => {
    await abrir();
    servidor.alSubir = () => { throw new TypeError("Failed to fetch"); };
    subir();
    await waitFor(() => expect(screen.getByTestId("error-de-carga").textContent).toContain("Se cortó la conexión mientras se subía la planilla"));
    servidor.alSubir = () => ({ id: "l-nueva", proveedor: "Comodo", fecha_lista: dia(1), resumen: resumen(), avisos: [], salteadas: [] });
    fireEvent.click(screen.getByTestId("probar-de-nuevo"));
    await screen.findByTestId("revision");
    expect(servidor.subidas).toHaveLength(2);
  });

  it("aplicar muestra el avance real y termina con el resultado", async () => {
    await abrir();
    fireEvent.click(screen.getAllByTestId("retomar")[0]!);
    expect(screen.getByTestId("revision").textContent).toContain("Tresge, lista del");
    await screen.findAllByTestId("ejemplo");
    vi.useFakeTimers();
    servidor.estadoDeLista = () => ({ estado: "aplicando", resumen: resumen({ progreso: { procesadas: 3548, total: 7096, etapa: "precios" } }) });
    fireEvent.click(screen.getByTestId("aplicar"));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(llamadas("/listas/l-pend/aplicar")).toHaveLength(1);
    expect(screen.getByTestId("progreso").textContent).toContain("Guardando los precios de Tresge… 0 %");
    expect(screen.queryByTestId("volver")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_DEL_AVANCE); });
    expect(screen.getByTestId("progreso").textContent).toContain("Guardando los precios de Tresge… 45 %"); // la mitad de los precios, que llenan hasta el 90 %
    servidor.estadoDeLista = () => ({ estado: "aplicando", resumen: resumen({ progreso: { procesadas: 7096, total: 7096, etapa: "duplicados" } }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_DEL_AVANCE); });
    expect(screen.getByTestId("progreso").textContent).toContain("Buscando productos repetidos con otros proveedores… 95 %");
    expect(screen.getByTestId("progreso").textContent).toContain("Los 99 precios ya están guardados");
    // Un corte de internet no frena nada: se vuelve a preguntar.
    servidor.estadoDeLista = () => { throw new TypeError("Failed to fetch"); };
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_DEL_AVANCE); });
    expect(screen.getByTestId("progreso")).toBeTruthy();
    servidor.estadoDeLista = () => ({ estado: "aplicada", resumen: resumen({ nuevos: 3, modificados: 96 }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_DEL_AVANCE); });
    expect(screen.getByTestId("exito").textContent).toContain("Listo: 99 precios actualizados");
    expect(screen.getByTestId("exito").textContent).toContain("3 productos nuevos y 96 con precio nuevo");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(window.location.hash).toBe("#/productos");
  });

  it("si la aplicación se interrumpe, vuelve a la revisión con el motivo", async () => {
    await abrir();
    fireEvent.click(screen.getAllByTestId("retomar")[0]!);
    await screen.findAllByTestId("ejemplo");
    vi.useFakeTimers();
    servidor.estadoDeLista = () => ({ estado: "pendiente", resumen: resumen({ error: "No se pudo aplicar: se cayó la base" }) });
    fireEvent.click(screen.getByTestId("aplicar"));
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_DEL_AVANCE); });
    expect(screen.getByTestId("error-revision").textContent).toContain("No se pudo aplicar: se cayó la base.");
    expect(screen.getByTestId("aplicar")).toBeTruthy();
  });

  it("descartar no guarda nada y vuelve a la portada", async () => {
    await abrir();
    fireEvent.click(within(screen.getByTestId("lista-pendiente")).getByText("Retomar"));
    await screen.findAllByTestId("ejemplo");
    servidor.listas[0].estado = "descartada";
    fireEvent.click(screen.getByTestId("descartar"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Lista descartada"));
    expect(llamadas("/listas/l-pend/descartar")).toHaveLength(1);
    expect(screen.getByTestId("mensaje").textContent).toContain("No se guardó ningún precio");
    await waitFor(() => expect(screen.queryByTestId("lista-pendiente")).toBeNull());
    expect(screen.getByTestId("zona-de-carga")).toBeTruthy();
  });

  it("una lista que quedó aplicándose se puede seguir desde las últimas cargas", async () => {
    servidor.listas[0].estado = "aplicando";
    servidor.listas[0].resumen = resumen({ progreso: { procesadas: 3548, total: 7096, etapa: "precios" } });
    await abrir();
    vi.useFakeTimers();
    servidor.estadoDeLista = () => ({ estado: "aplicada", resumen: resumen() });
    fireEvent.click(screen.getByTestId("ver-avance"));
    expect(screen.getByTestId("progreso").textContent).toContain("Guardando los precios de Tresge… 45 %");
    await act(async () => { await vi.advanceTimersByTimeAsync(ESPERA_DEL_AVANCE); });
    expect(screen.getByTestId("exito")).toBeTruthy();
    expect(llamadas("/listas/l-pend/aplicar")).toHaveLength(0);
  });

  it("agregar un proveedor manda cómo vienen sus precios y muestra el costo de ejemplo", async () => {
    await abrir();
    fireEvent.click(screen.getByTestId("agregar-proveedor"));
    const hoja = screen.getByTestId("panel-proveedores");
    fireEvent.click(screen.getByTestId("guardar-proveedor"));
    expect(hoja.textContent).toContain("Escribí el nombre del proveedor.");
    fireEvent.change(screen.getByTestId("nombre-del-proveedor"), { target: { value: " comodo " } });
    fireEvent.click(screen.getByTestId("iva-con"));
    fireEvent.change(screen.getByTestId("descuento-del-proveedor"), { target: { value: "15" } });
    expect(screen.getByTestId("ejemplo-de-costo").textContent).toContain("$702,48"); // 1000 / 1,21 × 0,85
    fireEvent.click(screen.getByTestId("guardar-proveedor"));
    await waitFor(() => expect(hoja.textContent).toContain("Ya hay un proveedor que se llama comodo."));
    fireEvent.change(screen.getByTestId("nombre-del-proveedor"), { target: { value: "Ferretera del Sur" } });
    fireEvent.click(screen.getByTestId("guardar-proveedor"));
    await waitFor(() => expect(screen.getByTestId("mensaje").textContent).toContain("Proveedor Ferretera del Sur agregado"));
    expect(JSON.parse(String(llamadas("/proveedores").at(-1)![1].body))).toEqual({ nombre: "Ferretera del Sur", lector: null, precios_incluyen_iva: true, descuento_general: 0.15, descuento_contado: 0 });
    await waitFor(() => expect(screen.getAllByTestId("proveedor")).toHaveLength(4));
  });

  it("sin proveedores, el primer paso es agregar uno", async () => {
    servidor.proveedores = [];
    servidor.listas = [];
    dibujar(<Listas />, "listas");
    await waitFor(() => expect(screen.getByTestId("sin-proveedores").textContent).toContain("Todavía no hay proveedores"));
    expect(screen.queryByTestId("zona-de-carga")).toBeNull();
    fireEvent.click(screen.getByText("Agregar el primer proveedor"));
    expect(screen.getByTestId("panel-proveedores")).toBeTruthy();
  });

  it("sin conexión lo avisa y no deja cargar ni aplicar", async () => {
    await abrir();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    act(() => { window.dispatchEvent(new Event("offline")); });
    expect(screen.getByTestId("aviso-sin-conexion").textContent).toContain("Cargar una lista necesita internet");
    expect((screen.getByTestId("elegir-archivo") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getAllByTestId("retomar")[0]!);
    expect((screen.getByTestId("aplicar") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId("revision").textContent).toContain("Sin conexión: para aplicar hace falta internet.");
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    act(() => { window.dispatchEvent(new Event("online")); });
    expect((screen.getByTestId("aplicar") as HTMLButtonElement).disabled).toBe(false);
  });

  it("si no se pueden traer las listas, lo dice y deja reintentar", async () => {
    apiFalsa.mockRejectedValue(new TypeError("Failed to fetch"));
    dibujar(<Listas />, "listas");
    await waitFor(() => expect(screen.getByTestId("error-listas").textContent).toContain("No se pudieron traer las listas"));
    reiniciar();
    fireEvent.click(screen.getByTestId("reintentar"));
    await waitFor(() => expect(screen.getByTestId("zona-de-carga")).toBeTruthy());
  });
});
