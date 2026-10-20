import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";

// La cámara se simula: el escáner de mentira entrega el código al tocar un botón.
const camara = vi.hoisted(() => ({ hay: true }));
vi.mock("../plataforma/camara/Escaner", () => ({
  hayCamara: () => camara.hay,
  Escaner: ({ alDetectar, alCerrar }: { alDetectar: (c: string) => void; alCerrar: () => void }) => (
    <div data-testid="escaner"><button type="button" onClick={() => alDetectar("7791234567890")}>leer</button><button type="button" onClick={alCerrar}>cerrar</button></div>
  ),
}));
const puesto = vi.hoisted(() => ({ local: null as { id: string; expira_en: string } | null, alRecibir: null as ((c: string) => void) | null, parar: vi.fn() }));
vi.mock("../puesto", () => ({ puestoLocal: () => puesto.local, escucharPuesto: (_id: string, alRecibir: (c: string) => void) => { puesto.alRecibir = alRecibir; return puesto.parar; } }));

import { CodigoDeBarras } from "./CodigoDeBarras";

function armar(celular: boolean, extra: Parameters<typeof producto>[0][] = [], base: Partial<Parameters<typeof producto>[0]> = {}) {
  const falso = catalogoFalso([producto({ id: "mecha", descripcion: "MECHA 6 MM", ...base }), ...extra.map(producto)]);
  // La pantalla que lo contiene: tiene el catálogo y guarda en él.
  function Ficha() {
    const { catalogo: c } = falso.useCatalogoFalso();
    return <CodigoDeBarras producto={c.find((p) => p.id === "mecha")!} celular={celular} alGuardar={(codigo) => falso.actualizarProducto("mecha", { codigo_barras: codigo })} quienLoTiene={async (codigo) => c.find((x) => x.id !== "mecha" && x.codigo_barras === codigo)} />;
  }
  render(<Ficha />);
  return falso;
}

// El código de barras de un producto (RF-08): se carga desde su ficha, escaneándolo.
describe("Código de barras en la ficha", () => {
  beforeEach(() => { camara.hay = true; puesto.local = null; puesto.alRecibir = null; puesto.parar.mockClear(); });

  it("en el celular, el botón abre la cámara y lo escaneado queda guardado en el producto", async () => {
    const falso = armar(true);
    expect(screen.getByTestId("codigo-actual").textContent).toBe("Sin código"); // 016-E08
    expect(screen.queryByTestId("copiar-codigo")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Escanear código" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "leer" })); });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { codigo_barras: "7791234567890" });
    expect(screen.queryByTestId("escaner")).toBeNull();
    expect(screen.getByTestId("codigo-actual").textContent).toBe("7791234567890");
    expect(screen.getByTestId("codigo-guardado").textContent).toContain("Código actualizado"); // 016-E09
    expect(screen.getByRole("button", { name: "Escanear código" })).toBeTruthy();
  });

  it("si otro producto ya tiene ese código, lo dice y manda a Duplicados", async () => {
    armar(true, [{ id: "otra", descripcion: "MECHA 6 MM DE OTRO PROVEEDOR", codigo_barras: "7791234567890" }]);
    fireEvent.click(screen.getByTestId("escanear-codigo"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "leer" })); });
    expect(screen.getByTestId("codigo-en-otro").textContent).toContain("También lo tiene «MECHA 6 MM DE OTRO PROVEEDOR»");
  });

  it("en la computadora se tipea, y vacío no se guarda", async () => {
    const falso = armar(false);
    fireEvent.click(screen.getByRole("button", { name: "Cargar el código" }));
    expect(screen.getByTestId("ayuda-codigo").textContent).toContain("vinculá el celular desde Vender");
    fireEvent.click(screen.getByTestId("guardar-codigo"));
    expect(screen.getByRole("alert").textContent).toContain("Escribí el código");
    expect(falso.actualizarProducto).not.toHaveBeenCalled();
    fireEvent.change(screen.getByTestId("codigo-tipeado"), { target: { value: " 7790001112223 " } });
    await act(async () => { fireEvent.click(screen.getByTestId("guardar-codigo")); });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { codigo_barras: "7790001112223" });
    expect(screen.getByTestId("codigo-actual").textContent).toBe("7790001112223");
  });

  it("en la computadora con el celular vinculado, lo que escanea el celular queda en este producto", async () => {
    puesto.local = { id: "puesto-1", expira_en: "2099-01-01" };
    const falso = armar(false);
    expect(puesto.alRecibir).toBeNull(); // no escucha hasta que se pide cargar el código
    fireEvent.click(screen.getByTestId("escanear-codigo"));
    expect(screen.getByTestId("ayuda-codigo").textContent).toContain("celular vinculado");
    await act(async () => { puesto.alRecibir!("7799998887776"); });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { codigo_barras: "7799998887776" });
    expect(puesto.parar).toHaveBeenCalled(); // al guardar deja de escuchar
  });
});

// La ficha renovada (specs/016): copiar el código y la última lectura.
describe("copiar el código y la última lectura", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it("016-E06 016-E07: el código con su botón de copiar, que lo copia y lo avisa", async () => {
    const escribir = vi.fn(async () => undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText: escribir } });
    armar(true, [], { codigo_barras: "7791234000004" });
    expect(screen.getByTestId("codigo-actual").textContent).toBe("7791234000004");
    expect(screen.getByTestId("escanear-codigo").textContent).toBe("Escanear código"); // al lado
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Copiar el código" })); });
    expect(escribir).toHaveBeenCalledWith("7791234000004");
    expect(screen.getByTestId("codigo-copiado").textContent).toBe("Código copiado");
  });

  it("016-E07: si el navegador no deja copiar, el código queda seleccionado y lo dice", async () => {
    vi.stubGlobal("navigator", { ...navigator, clipboard: undefined });
    armar(true, [], { codigo_barras: "7791234000004" });
    await act(async () => { fireEvent.click(screen.getByTestId("copiar-codigo")); });
    expect(screen.getByTestId("codigo-copiado").textContent).toContain("quedó seleccionado");
    expect(window.getSelection()?.toString()).toBe("7791234000004");
  });

  it("016-E10: un código cargado antes dice la fecha y la hora de su última lectura", () => {
    const d = new Date(2026, 9, 13, 10, 24);
    armar(true, [], { codigo_barras: "7791234000004", codigo_leido_en: d.toISOString() } as never);
    expect(screen.getByTestId("ultima-lectura").textContent).toBe("Última lectura: 13/10/2026 · 10:24");
    expect(screen.queryByTestId("codigo-guardado")).toBeNull(); // «Código actualizado», solo recién cargado
  });

  it("016-E11: sin fecha guardada no se inventa una", () => {
    armar(true, [], { codigo_barras: "7791234000004" });
    expect(screen.queryByTestId("ultima-lectura")).toBeNull();
  });

  it("016-E13: en la computadora con el celular vinculado, el botón dice que se escanea con el celular", () => {
    puesto.local = { id: "puesto-1", expira_en: "2099-01-01" };
    armar(false, [], { codigo_barras: "7791234000004" });
    expect(screen.getByTestId("escanear-codigo").textContent).toBe("Escanear con el celular");
    puesto.local = null;
  });
});
