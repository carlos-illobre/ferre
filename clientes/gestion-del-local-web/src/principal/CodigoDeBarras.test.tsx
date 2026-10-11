import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { catalogoFalso, producto } from "../pruebas/catalogo-falso";

// La cámara se simula: el escáner de mentira entrega el código al tocar un botón.
const camara = vi.hoisted(() => ({ hay: true }));
vi.mock("./celular/componentes/Escaner", () => ({
  hayCamara: () => camara.hay,
  Escaner: ({ alDetectar, alCerrar }: { alDetectar: (c: string) => void; alCerrar: () => void }) => (
    <div data-testid="escaner"><button type="button" onClick={() => alDetectar("7791234567890")}>leer</button><button type="button" onClick={alCerrar}>cerrar</button></div>
  ),
}));
const puesto = vi.hoisted(() => ({ local: null as { id: string; expira_en: string } | null, alRecibir: null as ((c: string) => void) | null, parar: vi.fn() }));
vi.mock("../puesto", () => ({ puestoLocal: () => puesto.local, escucharPuesto: (_id: string, alRecibir: (c: string) => void) => { puesto.alRecibir = alRecibir; return puesto.parar; } }));

import { CodigoDeBarras } from "./CodigoDeBarras";

function armar(celular: boolean, extra: Parameters<typeof producto>[0][] = []) {
  const falso = catalogoFalso([producto({ id: "mecha", descripcion: "MECHA 6 MM" }), ...extra.map(producto)]);
  // La pantalla que lo contiene: tiene el catálogo y guarda en él.
  function Ficha() {
    const { catalogo: c } = falso.useCatalogoFalso();
    return <CodigoDeBarras producto={c.find((p) => p.id === "mecha")!} celular={celular} alGuardar={(codigo) => falso.actualizarProducto("mecha", { codigo_barras: codigo })} quienLoTiene={(codigo) => c.find((x) => x.id !== "mecha" && x.codigo_barras === codigo)} />;
  }
  render(<Ficha />);
  return falso;
}

// El código de barras de un producto (RF-08): se carga desde su ficha, escaneándolo.
describe("Código de barras en la ficha", () => {
  beforeEach(() => { camara.hay = true; puesto.local = null; puesto.alRecibir = null; puesto.parar.mockClear(); });

  it("en el celular, el botón abre la cámara y lo escaneado queda guardado en el producto", async () => {
    const falso = armar(true);
    expect(screen.getByTestId("codigo-actual").textContent).toBe("Todavía no tiene");
    fireEvent.click(screen.getByRole("button", { name: "Escanear el código" }));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "leer" })); });
    expect(falso.actualizarProducto).toHaveBeenCalledWith("mecha", { codigo_barras: "7791234567890" });
    expect(screen.queryByTestId("escaner")).toBeNull();
    expect(screen.getByTestId("codigo-actual").textContent).toBe("7791234567890");
    expect(screen.getByTestId("codigo-guardado").textContent).toContain("Ya se puede buscar este producto escaneándolo");
    expect(screen.getByRole("button", { name: "Escanear otro código" })).toBeTruthy();
  });

  it("si otro producto ya tiene ese código, lo dice y manda a Duplicados", async () => {
    armar(true, [{ id: "otra", descripcion: "MECHA 6 MM DE OTRO PROVEEDOR", codigo_barras: "7791234567890" }]);
    fireEvent.click(screen.getByTestId("escanear-codigo"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "leer" })); });
    expect(screen.getByTestId("codigo-guardado").textContent).toContain("También lo tiene «MECHA 6 MM DE OTRO PROVEEDOR»");
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
