import { describe, expect, it } from "vitest";
import { base } from "./conexion.js";
import * as datos from "./listas.js";
import { lista, precio, producto, proveedor, usuario } from "./pruebas/datos.js";

// Listas de precios (002).
describe("las listas", () => {
  it("el proveedor por su lector y su configuración, si está activo", async () => {
    const id = await proveedor({ nombre: "Comodo", lector: "comodo-zz", precios_incluyen_iva: true });
    await proveedor({ lector: "erpa-zz", activo: false });
    expect(await datos.proveedorConLector("comodo-zz")).toBe(id);
    expect(await datos.proveedorConLector("erpa-zz")).toBeNull();
    expect(await datos.proveedorActivo(id)).toMatchObject({ nombre: "Comodo", precios_incluyen_iva: true, lector: "comodo-zz" });
    expect(await datos.proveedorActivo(crypto.randomUUID())).toBeNull();
  });

  it("una lista pendiente se aplica una sola vez, con su progreso, y queda en el historial", async () => {
    const prov = await proveedor({ nombre: "ZZ Proveedor" });
    const id = crypto.randomUUID();
    const ana = await usuario();
    await datos.guardarPendiente({ id, proveedorId: prov, archivoNombre: "lista.xlsx", ruta: "/datos/lista.xlsx", fechaLista: "2026-10-01", resumen: "{}", avisos: "[]", usuarioId: ana });
    expect(await datos.buscarLista(id)).toMatchObject({ estado: "pendiente", archivo_ruta: "/datos/lista.xlsx", fecha_lista: "2026-10-01" });
    expect(await datos.buscarLista(crypto.randomUUID())).toBeNull();
    expect(await datos.empezarAAplicar(id)).toBe(true);
    expect(await datos.empezarAAplicar(id)).toBe(false);
    await datos.anotarProgreso(id, { procesadas: 10, total: 20 });
    expect(await datos.estadoDe(id)).toMatchObject({ estado: "aplicando", resumen: { progreso: { procesadas: 10, total: 20 } }, proveedor: "ZZ Proveedor" });
    await datos.volverAPendiente(id, "falló");
    expect(await datos.estadoDe(id)).toMatchObject({ estado: "pendiente", resumen: { error: "falló" } });
    await datos.empezarAAplicar(id);
    await datos.marcarAplicada(id, ana, { nuevos: 3 });
    const aplicada = await datos.estadoDe(id);
    expect(aplicada).toMatchObject({ estado: "aplicada", resumen: { nuevos: 3 } });
    expect((aplicada!.resumen as Record<string, unknown>).error).toBeUndefined();
    expect(await datos.estadoDe(crypto.randomUUID())).toBeNull();
    expect((await datos.historial()).find((l) => l.id === id)).toMatchObject({ proveedor: "ZZ Proveedor", estado: "aplicada" });
  });

  it("descartar solo una pendiente", async () => {
    const id = await lista(await proveedor());
    expect(await datos.descartar(id)).toBe(true);
    expect(await datos.descartar(id)).toBe(false);
  });

  it("los costos y precios vigentes de cada código: la fila más reciente", async () => {
    const prov = await proveedor();
    const p = await producto();
    await precio(p, prov, { codigo_proveedor: "A1", costo_neto: 10, precio_lista: 20, fecha_lista: "2026-09-01" });
    await precio(p, prov, { codigo_proveedor: "A1", costo_neto: 11, precio_lista: 22, fecha_lista: "2026-10-01" });
    expect(await datos.costosVigentes(prov)).toEqual([{ codigo_proveedor: "A1", costo_neto: "11.0000" }]);
    expect(await datos.preciosVigentes(prov)).toEqual([{ producto_id: p, codigo_proveedor: "A1", costo_neto: "11.0000", precio_lista: "22.0000" }]);
  });

  it("un lote guarda productos y costos de una vez; sin filas, no hace nada", async () => {
    const prov = await proveedor({ nombre: "ZZ Lote" });
    const l = await lista(prov, { archivo_nombre: "lote.xlsx", archivo_ruta: "/datos/lote.xlsx" });
    const p = crypto.randomUUID();
    await datos.guardarLote([[p, "Pinza", "Bahco", "779", prov]], [[crypto.randomUUID(), p, prov, l, "P1", "Pinza", 100, "{}", 90, 0.21, null, null, "2026-10-01"]]);
    await datos.guardarLote([], []);
    expect(await datos.origenDe(l)).toMatchObject({ archivo_nombre: "lote.xlsx", proveedor: "ZZ Lote", productos: 1 });
    expect(await datos.origenDe(crypto.randomUUID())).toBeNull();
    expect(await datos.archivoDe(l)).toEqual({ archivo_nombre: "lote.xlsx", archivo_ruta: "/datos/lote.xlsx" });
    expect(await datos.archivoDe(crypto.randomUUID())).toBeNull();
  });
});
