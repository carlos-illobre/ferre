import { describe, expect, it } from "vitest";
import { etiquetarTablas } from "./tablas";

describe("etiquetarTablas", () => {
  it("pone en cada celda el título de su columna; las que abarcan varias quedan sin título", () => {
    document.body.innerHTML = `<table><thead><tr><th>Hora</th><th>Productos</th><th>Total</th></tr></thead>
      <tbody><tr><td>10:00</td><td>2 × MECHA</td><td>$3.000</td></tr><tr><td colspan="3">detalle</td></tr></tbody>
      <tbody><tr><td>11:00</td><td>X</td><td>$1</td></tr></tbody></table>`;
    etiquetarTablas();
    const celdas = Array.from(document.querySelectorAll("td")).map((td) => td.getAttribute("data-etiqueta"));
    expect(celdas).toEqual(["Hora", "Productos", "Total", "", "Hora", "Productos", "Total"]);
  });
  it("una tabla sin encabezado queda como está", () => {
    document.body.innerHTML = `<table><tbody><tr><td>a</td></tr></tbody></table>`;
    etiquetarTablas();
    expect(document.querySelector("td")!.hasAttribute("data-etiqueta")).toBe(false);
  });
});
