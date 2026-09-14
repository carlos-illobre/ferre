import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Desplegable } from "./Desplegable";
import { Explicacion } from "./Explicacion";
import { FotoProducto } from "./Foto";

describe("Desplegable", () => {
  it("arranca abierto y se pliega al tocar el título", () => {
    render(<Desplegable titulo="Ventas de hoy"><p>contenido</p></Desplegable>);
    const titulo = screen.getByRole("button", { name: /Ventas de hoy/ });
    expect(titulo.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(titulo);
    expect(titulo.getAttribute("aria-expanded")).toBe("false");
  });
  it("puede arrancar cerrado", () => {
    render(<Desplegable titulo="Filas salteadas" abiertoAlInicio={false}><p>x</p></Desplegable>);
    expect(screen.getByRole("button", { name: /Filas salteadas/ }).getAttribute("aria-expanded")).toBe("false");
  });
});

describe("Explicacion", () => {
  it("muestra el valor, un ícono '?' redondo y los pasos", () => {
    render(<Explicacion valor="$4.000,00" pasos={["Costo $1.500,00", "+ 100 % de margen = $3.000,00"]} />);
    expect(screen.getByText("$4.000,00")).toBeTruthy();
    expect(screen.getByTitle("¿De dónde sale este número?").textContent).toBe("?");
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Costo $1.500,00", "+ 100 % de margen = $3.000,00"]);
  });
});

describe("FotoProducto", () => {
  it("sin foto muestra el ícono, se amplía con la descripción y Escape cierra", () => {
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
  it("una foto subida ('/fotos/...') se muestra desde la API", () => {
    render(<FotoProducto id="p1" url="/fotos/abc.jpg" descripcion="TALADRO" />);
    expect(screen.getByTestId("foto-chica").querySelector("img")?.getAttribute("src")).toBe("http://api.prueba/fotos/abc.jpg");
  });
  it("con foto muestra la imagen chica y la grande", () => {
    render(<FotoProducto id="p1" url="https://fotos/taladro.jpg" descripcion="TALADRO" />);
    expect(screen.getByTestId("foto-chica").querySelector("img")?.getAttribute("src")).toBe("https://fotos/taladro.jpg");
    fireEvent.click(screen.getByTestId("foto-chica"));
    expect(screen.getByRole("img", { name: "TALADRO" })).toBeTruthy();
  });
});
