import { describe, expect, it } from "vitest";
import { cambiarProveedor, insertarProveedor, todosLosProveedores } from "./catalogo.js";
import { base } from "./conexion.js";

describe("los proveedores", () => {
  it("se dan de alta, se listan por nombre y cambian solo en lo que viene", async () => {
    const id = crypto.randomUUID();
    await insertarProveedor(base, { id, nombre: "ZZ Comodo", precios_incluyen_iva: true, descuento_general: 0.1, descuento_contado: 0.05, lector: "comodo" });
    expect(await cambiarProveedor(base, id, { nombre: "ZZZ Comodo", activo: false })).toBe(true);
    expect((await todosLosProveedores(base)).at(-1)).toMatchObject({ id, nombre: "ZZZ Comodo", activo: false, lector: "comodo", descuento_general: "0.1000" });
  });

  it("sin nada que cambiar, o si no existe, solo dice si existía", async () => {
    const id = crypto.randomUUID();
    expect(await cambiarProveedor(base, id, {})).toBe(false);
    expect(await cambiarProveedor(base, id, { nombre: "Otro" })).toBe(false);
    await insertarProveedor(base, { id, nombre: "Uno", precios_incluyen_iva: false, descuento_general: 0, descuento_contado: 0, lector: null });
    expect(await cambiarProveedor(base, id, {})).toBe(true);
  });
});
