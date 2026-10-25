import { describe, expect, it } from "vitest";
import { producto } from "../../pruebas/catalogo-falso";
import { queHaceEnter } from "./busqueda-de-venta";
import { otraCantidad } from "./cantidad";
import { loQueEntro } from "./llegados-del-celular";
import type { Item } from "./venta-en-curso";

const item = (clave: string, cantidad: number, unidad: Item["unidad"] = "unidad") => ({ clave, cantidad, unidad }) as Item;

describe("lo que comparten el celular y la computadora al vender (024-T004)", () => {
  it("Enter: el producto marcado; si no hay, un código; si no, un ítem libre; vacía, nada", () => {
    const mecha = producto({ id: "m", descripcion: "MECHA" });
    expect(queHaceEnter("mecha", [mecha], 0)).toEqual({ tipo: "producto", producto: mecha });
    expect(queHaceEnter("7791234567", [], 0)).toEqual({ tipo: "codigo", codigo: "7791234567" });
    expect(queHaceEnter("tarugo raro", [], 0)).toEqual({ tipo: "libre", texto: "tarugo raro" });
    expect(queHaceEnter("", [], 0)).toEqual({ tipo: "vacia" });
  });

  it("+ y − van de a uno por unidad y de a medio en lo que se pesa; nunca a cero", () => {
    expect(otraCantidad(item("a", 2), 1)).toBe(3);
    expect(otraCantidad(item("a", 1.5, "kg"), -1)).toBe(1);
    expect(otraCantidad(item("a", 1), -1)).toBeNull();
  });

  it("lo que entró: un renglón nuevo o uno al que le subió la cantidad", () => {
    const antes = [item("a", 1), item("b", 2)];
    expect(loQueEntro(antes, [item("a", 1), item("b", 3), item("c", 1)]).map((i) => i.clave)).toEqual(["b", "c"]);
    expect(loQueEntro(antes, [item("a", 1)])).toEqual([]);
  });
});
