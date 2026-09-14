import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { Contador, Exito, Hoja, Segmentos, Toast } from "./base";
import { Explicacion } from "./Explicacion";
import { FotoProducto } from "./Foto";

describe("Hoja", () => {
  it("se cierra con Escape y tocando el fondo, no tocando adentro", () => {
    const alCerrar = vi.fn();
    render(<Hoja titulo="Elegí" alCerrar={alCerrar}><p>contenido</p></Hoja>);
    fireEvent.click(screen.getByText("contenido"));
    expect(alCerrar).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(alCerrar).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("presentation"));
    expect(alCerrar).toHaveBeenCalledTimes(2);
  });
});

describe("Explicacion", () => {
  it("muestra el valor y, al tocarlo, una hoja con los pasos numerados", () => {
    render(<Explicacion valor="$4.000" pasos={["Costo $1.500,00", "+ 100 % de margen = $3.000,00"]} />);
    expect(screen.queryByTestId("hoja-explicacion")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "De dónde sale $4.000" }));
    const pasos = within(screen.getByTestId("hoja-explicacion")).getAllByRole("listitem").map((li) => li.textContent);
    expect(pasos).toEqual(["1Costo $1.500,00", "2+ 100 % de margen = $3.000,00"]);
    fireEvent.click(screen.getByRole("button", { name: "Listo" }));
    expect(screen.queryByTestId("hoja-explicacion")).toBeNull();
  });
});

describe("Contador", () => {
  it("por unidad suma de a 1 y no baja de 1; a granel de a 0,5 con un decimal", () => {
    const alCambiar = vi.fn();
    const { rerender } = render(<Contador valor={1} entera alCambiar={alCambiar} />);
    fireEvent.click(screen.getByRole("button", { name: "Menos" }));
    expect(alCambiar).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(alCambiar).toHaveBeenLastCalledWith(2);
    rerender(<Contador valor={1.5} entera={false} alCambiar={alCambiar} />);
    expect((screen.getByTestId("cantidad") as HTMLInputElement).value).toBe("1,5");
    fireEvent.click(screen.getByRole("button", { name: "Más" }));
    expect(alCambiar).toHaveBeenLastCalledWith(2);
    fireEvent.change(screen.getByTestId("cantidad"), { target: { value: "2,75" } });
    expect(alCambiar).toHaveBeenLastCalledWith(2.8);
  });
});

describe("Segmentos, Toast y Exito", () => {
  it("el segmento activo se marca y elegir otro avisa", () => {
    const alElegir = vi.fn();
    render(<Segmentos opciones={[{ valor: "a", nombre: "Stock" }, { valor: "b", nombre: "Contar" }]} actual="a" alElegir={alElegir} />);
    expect(screen.getByRole("tab", { name: "Stock" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("tab", { name: "Contar" }));
    expect(alElegir).toHaveBeenCalledWith("b");
  });
  it("el toast se cierra y el éxito muestra el importe grande", () => {
    const cerrar = vi.fn();
    render(<><Toast texto="Listo" alCerrar={cerrar} /><Exito que="Venta registrada" importe="$10.500" medio="Efectivo" detalle="2 productos" boton="Nueva venta" alCerrar={cerrar} /></>);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("exito").textContent).toContain("$10.500");
    fireEvent.click(screen.getByTestId("cerrar-exito"));
    expect(cerrar).toHaveBeenCalledTimes(2);
  });
});

describe("FotoProducto", () => {
  it("sin foto muestra el lugar, se amplía con la descripción y Escape cierra", () => {
    render(<FotoProducto id="p1" url={null} descripcion="TALADRO 750 W" />);
    expect(screen.queryByTestId("foto-grande")).toBeNull();
    fireEvent.click(screen.getByTestId("foto-chica"));
    const grande = screen.getByTestId("foto-grande");
    expect(grande.textContent).toContain("TALADRO 750 W");
    expect(grande.textContent).toContain("todavía no tiene foto");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("foto-grande")).toBeNull();
  });
  it("en la foto grande se puede sacar una nueva con el celular", async () => {
    const alSubir = vi.fn(async () => undefined);
    render(<FotoProducto id="p1" url={null} descripcion="TALADRO" alSubir={alSubir} />);
    fireEvent.click(screen.getByTestId("foto-chica"));
    const entrada = screen.getByTestId("archivo-foto") as HTMLInputElement;
    expect(entrada.getAttribute("capture")).toBe("environment");
    expect(screen.getByTestId("sacar-foto").textContent).toContain("Sacar foto");
    const archivo = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(entrada, { target: { files: [archivo] } });
    await waitFor(() => expect(alSubir).toHaveBeenCalledWith(archivo));
  });
  it("una foto subida ('/fotos/...') se muestra desde la API, chica y grande", () => {
    render(<FotoProducto id="p1" url="/fotos/abc.jpg" descripcion="TALADRO" />);
    expect(screen.getByTestId("foto-chica").querySelector("img")?.getAttribute("src")).toBe("http://api.prueba/fotos/abc.jpg");
    fireEvent.click(screen.getByTestId("foto-chica"));
    expect(screen.getByRole("img", { name: "TALADRO" })).toBeTruthy();
  });
});
