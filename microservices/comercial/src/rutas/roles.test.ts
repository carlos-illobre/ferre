import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";
import { PERMISOS } from "../permisos.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");
const { cargarParaPrueba } = await import("../productos/copia.js");


// Cada operación pide su permiso (RF-72): quien solo vende no puede lo demás.
describe("permisos por operación", () => {
  beforeEach(() => { base.actual = baseFalsa(); });
  const PROHIBIDO_AL_QUE_SOLO_VENDE: [string, string, string][] = [
    ["GET", "/ventas", "Ver las ventas del día"], ["POST", "/ventas/x/anular", "Anular ventas del día"],
    ["GET", "/listas", "Cargar listas de precios"], ["POST", "/proveedores", "Cargar listas de precios"],
    ["GET", "/equivalencias", "Unir duplicados"],
    ["PUT", "/pedidos/x", "Encargar compras"], ["POST", "/compras", "Registrar ingresos"], ["GET", "/compras", "Ver las compras"], ["GET", "/compras/semana", "Ver los gastos"],
    ["POST", "/stock/p1/ajustes", "Contar y corregir stock"], ["GET", "/sectores", "Contar y corregir stock"],
    ["GET", "/anomalias", "Ver las anomalías"], ["GET", "/consultas", "Ver las ventas del negocio"],
    ["PATCH", "/productos/p1", "Fijar márgenes"],
  ];
  it("sin el permiso, 403 diciendo cuál hace falta, y la sesión sigue", async () => {
    for (const [metodo, ruta, permiso] of PROHIBIDO_AL_QUE_SOLO_VENDE) {
      const r = await pedir(app, metodo, ruta, { rol: "soloVende", ...(metodo === "GET" ? {} : { cuerpo: { margen_elegido: 50 } }) });
      expect(r.status, `${metodo} ${ruta}`).toBe(403);
      expect(((await r.json()) as { error: string }).error, `${metodo} ${ruta}`).toContain(permiso);
    }
  });
  it("lo que no pide permiso anda con cualquier sesión: catálogo, stock, clientes y proveedores", async () => {
    for (const ruta of ["/productos", "/stock", "/clientes", "/proveedores"]) {
      expect((await pedir(app, "GET", ruta, { rol: "soloVende" })).status, ruta).toBe(200);
    }
  });
  it("028-E08: los tickets ya no son de Comercial: sus rutas no existen", async () => {
    for (const [metodo, ruta] of [["GET", "/tickets"], ["POST", "/tickets"], ["GET", "/tickets/fotos/a.png"]] as const) {
      expect((await pedir(app, metodo, ruta, { rol: "dueño" })).status, ruta).toBe(404);
    }
  });
  it("el inventario no lleva dinero para quien no ve el dinero invertido", async () => {
    base.actual.programar(/FROM movimiento_stock GROUP BY producto_id/, { rows: [{ id: "p1", stock: "17", ultimo_movimiento: null }] });
    cargarParaPrueba([{ id: "p1", descripcion: "P1", costo_neto: "1000", proveedor: "Comodo" }]); // el costo, de la copia (specs/018)
    const sin = (await (await pedir(app, "GET", "/stock", { rol: "soloVende" })).json()) as { productos: { stock: string; costo_neto: unknown; valor: string }[]; valor_total: number; por_proveedor: object };
    expect(sin.productos[0]).toMatchObject({ stock: "17", costo_neto: null, valor: "0" });
    expect(sin.valor_total).toBe(0);
    expect(sin.por_proveedor).toEqual({});
    const con = (await (await pedir(app, "GET", "/stock", { rol: "dueño" })).json()) as { valor_total: number };
    expect(con.valor_total).toBe(17000);
  });
  it("todos los permisos de la lista se usan en alguna ruta de esta prueba o de las de roles", () => {
    // «Anular ventas de cualquier día» se prueba con las ventas; «Ver costos» no lo exige ninguna
    // ruta: decide qué muestran las pantallas. Los de Procesos y «Ver quién hizo qué» los exigen
    // Procesos y Auditoría, que los leen de X-Permisos (specs/026 y 027); «Ver el dinero
    // invertido», con el stock (secciones-de-negocio.test.ts). Los de administrar usuarios, roles y el
    // sistema los exige Acceso (specs/029, sus pruebas de roles).
    const usados = new Set([...PROHIBIDO_AL_QUE_SOLO_VENDE.map(([, , nombre]) => nombre), "Vender", "Administrar usuarios", "Administrar roles", "Administrar el sistema", "Anular ventas de cualquier día", "Ver costos", "Ver procesos", "Dibujar procesos", "Ver quién hizo qué", "Ver el dinero invertido"]);
    expect(PERMISOS.filter((p) => !usados.has(p.nombre)).map((p) => p.nombre)).toEqual([]);
  });
});
