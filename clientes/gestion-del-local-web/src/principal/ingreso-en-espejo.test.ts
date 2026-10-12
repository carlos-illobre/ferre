import { describe, expect, it } from "vitest";
import { producto } from "../pruebas/catalogo-falso";
import { ingresoParaElEspejo, renglonesDeIngresoDelEspejo } from "./ingreso-en-espejo";

const cinta = producto({ id: "cinta", descripcion: "CINTA AISLADORA", costo_neto: "1000" });
type Renglon = { clave: string; producto: typeof cinta | null; descripcion: string; cantidad: number; costo: number | null; costoTexto: string; costoLista: number | null };
const renglon = (extra: Partial<Renglon> = {}): Renglon => ({ clave: "r1", producto: cinta, descripcion: "CINTA AISLADORA", cantidad: 10, costo: 1200, costoTexto: "1200", costoLista: 1000, ...extra });
const aTexto = (c: number) => String(c).replace(".", ",");

// El ingreso de mercadería en espejo entre el celular y la computadora (decisión 60).
describe("el ingreso que viaja entre el celular y la computadora", () => {
  it("viaja con el proveedor, el comprobante, la foto, la fecha y los renglones; el texto del costo que se tipea, no", () => {
    const v = ingresoParaElEspejo("prov1", "factura", "foto.jpg", "2026-10-12", [renglon({ costoTexto: "1200," })]);
    expect(v).toEqual({ proveedorId: "prov1", comprobante: "factura", foto: "foto.jpg", fecha: "2026-10-12", renglones: [{ clave: "r1", productoId: "cinta", descripcion: "CINTA AISLADORA", cantidad: 10, costo: 1200, costoLista: 1000 }] });
  });

  it("del otro lado se arma con su catálogo y vuelve a salir igual: no rebota", () => {
    const v = ingresoParaElEspejo("prov1", "remito", null, "2026-10-12", [renglon()]);
    const armados = renglonesDeIngresoDelEspejo<Renglon>(v, [cinta], [], aTexto);
    expect(armados[0]!.producto).toBe(cinta);
    expect(ingresoParaElEspejo("prov1", "remito", null, "2026-10-12", armados)).toEqual(v);
  });

  it("si el costo no cambió se conserva lo que se estaba tipeando; si cambió, se escribe como lo escribe esta pantalla", () => {
    const tipeando = renglon({ costo: 1200, costoTexto: "1200," });
    const igual = ingresoParaElEspejo("p", "factura", null, "2026-10-12", [renglon({ cantidad: 12 })]);
    expect(renglonesDeIngresoDelEspejo<Renglon>(igual, [cinta], [tipeando], aTexto)[0]).toMatchObject({ cantidad: 12, costoTexto: "1200," });
    const otro = ingresoParaElEspejo("p", "factura", null, "2026-10-12", [renglon({ costo: 1350.5 })]);
    expect(renglonesDeIngresoDelEspejo<Renglon>(otro, [cinta], [tipeando], aTexto)[0]!.costoTexto).toBe("1350,5");
  });

  it("un producto nuevo (sin id) viaja como tal, y uno que este catálogo no tiene conserva su identidad", () => {
    const v = ingresoParaElEspejo("p", "factura", null, "2026-10-12", [renglon({ producto: null, descripcion: "PINCEL NUEVO", costo: null, costoLista: null }), renglon({ clave: "r2" })]);
    const armados = renglonesDeIngresoDelEspejo<Renglon>(v, [], [], aTexto);
    expect(armados[0]).toMatchObject({ producto: null, descripcion: "PINCEL NUEVO", costoTexto: "" });
    expect(armados[1]!.producto?.id).toBe("cinta");
    expect(ingresoParaElEspejo("p", "factura", null, "2026-10-12", armados)).toEqual(v);
  });
});
