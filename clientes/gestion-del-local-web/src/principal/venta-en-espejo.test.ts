import { describe, expect, it } from "vitest";
import { producto } from "../pruebas/catalogo-falso";
import { renglonesDelEspejo, ventaParaElEspejo } from "./venta-en-espejo";

const mecha = producto({ id: "mecha", descripcion: "MECHA 8 MM", margen_elegido: 100 });
type Renglon = { clave: string; producto: typeof mecha | null; descripcion: string; cantidad: number; unidad: string; precioManual: number | null; abierto: boolean };
const renglon = (extra: Record<string, unknown> = {}) => ({ clave: "r1", producto: mecha, descripcion: "MECHA 8 MM", cantidad: 3, unidad: "unidad", precioManual: null, abierto: true, ...extra }) as Renglon;

// La venta en espejo entre el celular y la computadora (decisión 60).
describe("la venta que viaja entre el celular y la computadora", () => {
  it("viaja con el id del producto, la cantidad, la unidad, el precio a mano, el margen, el medio y el cliente; lo que es de la pantalla no", () => {
    const v = ventaParaElEspejo([renglon()], "tarjeta", "c1");
    expect(v).toEqual({ items: [{ clave: "r1", productoId: "mecha", descripcion: "MECHA 8 MM", cantidad: 3, unidad: "unidad", precioManual: null, margen: 100 }], medio: "tarjeta", clienteId: "c1" });
    expect(JSON.stringify(v)).not.toContain("abierto");
  });

  it("del otro lado se arma con el catálogo propio, y vuelve a salir igual: no rebota", () => {
    const v = ventaParaElEspejo([renglon()], "efectivo", "");
    const armados = renglonesDelEspejo(v, [mecha], [renglon({ abierto: true })]);
    expect(armados[0]!.producto).toBe(mecha);
    expect(armados[0]!.abierto).toBe(true); // el renglón que ya estaba desplegado sigue desplegado
    expect(ventaParaElEspejo(armados, "efectivo", "")).toEqual(v);
  });

  it("el margen elegido para esta venta viaja con el renglón, sin tocar el producto del catálogo", () => {
    const v = ventaParaElEspejo([renglon({ producto: { ...mecha, margen_elegido: 300 } })], "efectivo", "");
    const armados = renglonesDelEspejo<Renglon>(v, [mecha], []);
    expect(armados[0]!.producto!.margen_elegido).toBe(300);
    expect(mecha.margen_elegido).toBe(100);
  });

  it("un producto que este catálogo todavía no tiene no se vuelve ítem libre: conserva su identidad al volver", () => {
    const v = ventaParaElEspejo([renglon()], "efectivo", "");
    const armados = renglonesDelEspejo<Renglon>(v, [], []);
    expect(armados[0]!.producto?.id).toBe("mecha");
    expect(ventaParaElEspejo(armados, "efectivo", "")).toEqual(v);
  });

  it("un ítem libre viaja como tal", () => {
    const v = ventaParaElEspejo([renglon({ producto: null, descripcion: "FLETE", precioManual: 5000 })], null, "");
    expect(renglonesDelEspejo<Renglon>(v, [mecha], [])[0]).toMatchObject({ producto: null, descripcion: "FLETE", precioManual: 5000 });
  });
});
