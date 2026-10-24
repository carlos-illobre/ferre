import { sql } from "kysely";
import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import * as datos from "./productos.js";
import { precio, producto, proveedor } from "./pruebas/datos.js";

// El catálogo que lee la copia del servidor (018, ADR-023).
describe("los productos", () => {
  it("el catálogo entero trae lo vigente, de a páginas, con su costo, sus proveedores y sus códigos", async () => {
    const [barato, caro] = [await proveedor({ nombre: "Barato" }), await proveedor({ nombre: "Caro" })];
    const p = await producto({ descripcion: "Martillo", proveedor_preferido_id: caro });
    await precio(p, barato, { codigo_proveedor: "B-1", costo_neto: 50 });
    await precio(p, caro, { codigo_proveedor: "C-1", costo_neto: 80 });
    const sinPrecio = await producto({ descripcion: "Sin precio" });
    await producto({ descripcion: "Dado de baja", activo: false });
    // Más que una página, para leer de a partes.
    await sql`INSERT INTO producto (id, descripcion) SELECT gen_random_uuid(), 'Relleno ' || n FROM generate_series(1, 1000) n`.execute(base);
    const { marca, filas, quitados } = await datos.leerCatalogoEntero();
    expect(/^\d+$/.test(marca)).toBe(true);
    expect(quitados).toEqual([]);
    expect(filas.length).toBe(1002);
    const martillo = filas.find((f) => f.id === p)!;
    expect(martillo).toMatchObject({ proveedor: "Caro", codigo_proveedor: "C-1", costo_neto: "80.0000", vigente: true });
    expect(martillo.codigos.sort()).toEqual(["B-1", "C-1"]);
    expect(martillo.proveedores.map((x) => x.proveedor)).toEqual(["Barato", "Caro"]);
    expect(filas.find((f) => f.id === sinPrecio)).toMatchObject({ proveedor: null, proveedores: [] });
  });

  it("lo que cambió desde una marca, con lo dado de baja y lo que ya no existe; una marca de otra base no sirve", async () => {
    const { marca } = await datos.leerCatalogoEntero();
    const nuevo = await producto({ descripcion: "Nuevo" });
    const baja = await producto({ descripcion: "Se da de baja" });
    await base.updateTable("producto").set({ activo: false }).where("id", "=", baja).execute();
    const borrado = crypto.randomUUID();
    await base.insertInto("cambio_de_producto").values({ producto_id: borrado }).execute();
    const cambios = await datos.leerCambiosDesde(marca);
    expect(cambios!.filas.find((f) => f.id === nuevo)).toMatchObject({ vigente: true });
    expect(cambios!.filas.find((f) => f.id === baja)).toMatchObject({ vigente: false });
    expect(cambios!.quitados).toContain(borrado);
    expect(await datos.leerCambiosDesde(String(BigInt(marca) + 1_000_000n))).toBeNull();
  });

  it("muchos cambios se leen de a páginas", async () => {
    const { marca } = await datos.leerCatalogoEntero();
    await sql`INSERT INTO producto (id, descripcion) SELECT gen_random_uuid(), 'Lote ' || n FROM generate_series(1, 1001) n`.execute(base);
    expect((await datos.leerCambiosDesde(marca))!.filas.filter((f) => f.descripcion.startsWith("Lote "))).toHaveLength(1001);
  });

  it("cambia solo las columnas permitidas de un producto activo", async () => {
    const p = await producto();
    expect(await datos.cambiar(p, { margen_elegido: 50, unidad: "kg" })).toBe(true);
    expect(await base.selectFrom("producto").select(["margen_elegido", "unidad"]).where("id", "=", p).executeTakeFirst()).toEqual({ margen_elegido: 50, unidad: "kg" });
    expect(await datos.cambiar(crypto.randomUUID(), { margen_elegido: 10 })).toBe(false);
    await expect(datos.cambiar(p, { descripcion: "x" } as never)).rejects.toThrow("No se cambia la columna descripcion de un producto");
  });

  it("las fotos se guardan con nombre al azar y se leen", async () => {
    const url = await datos.guardarFoto(Buffer.from("foto"), ".webp");
    expect(url).toMatch(/^\/fotos\/[0-9a-f-]{36}\.webp$/);
    expect(String(await datos.leerFoto(url.replace("/fotos/", "")))).toBe("foto");
  });
});
