import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";
import { PERMISOS } from "../permisos.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
const { app } = await import("../app.js");

const ROL = "0b0e1d6a-7c1f-4a55-9d0e-3f6c2a9b1c11";
const administran = (...ids: string[]) => base.actual.programar(/FROM usuario u\s+WHERE u\.activo AND \(SELECT count\(DISTINCT rp\.permiso\)/, { rows: ids.map((id) => ({ id })) });

// Los roles los arma el negocio con los permisos fijos del sistema (RF-75, ADR-017).
describe("roles", () => {
  beforeEach(() => { base.actual = baseFalsa(); administran("u-admin"); base.actual.programar(/UPDATE rol SET nombre/, { rowCount: 1 }); });

  it("la lista de permisos sale del servidor: quince, cada uno con su parte, nombre y explicación", async () => {
    const r = await pedir(app, "GET", "/permisos", { rol: "admin" });
    const lista = (await r.json()) as { clave: string; parte: string; nombre: string; detalle: string }[];
    expect(lista).toHaveLength(15);
    expect(lista.every((p) => p.clave && p.parte && p.nombre && p.detalle)).toBe(true);
    expect(new Set(lista.map((p) => p.parte))).toEqual(new Set(["Vender", "Catálogo", "Depósito", "Negocio", "Administración"]));
    expect((await pedir(app, "GET", "/permisos", { rol: "mostrador" })).status).toBe(403);
  });

  it("sin el permiso de administrar roles no se crean, cambian ni borran", async () => {
    for (const [metodo, ruta] of [["POST", "/roles"], ["PATCH", `/roles/${ROL}`], ["DELETE", `/roles/${ROL}`]] as const) {
      const r = await pedir(app, metodo, ruta, { rol: "mostrador", cuerpo: { nombre: "X", permisos: ["ventas.registrar"] } });
      expect(r.status, `${metodo} ${ruta}`).toBe(403);
      expect(((await r.json()) as { error: string }).error).toContain("Administrar roles");
    }
    expect((await pedir(app, "GET", "/roles", { rol: null })).status).toBe(401);
  });

  it("se crea un rol con su nombre y sus permisos, y queda en el registro", async () => {
    const r = await pedir(app, "POST", "/roles", { rol: "admin", cuerpo: { nombre: " Encargado ", permisos: ["ventas.registrar", "deposito.ingresos", "ventas.registrar"] } });
    expect(r.status).toBe(201);
    expect(base.actual.sqlDe(/INSERT INTO rol \(/)[0]!.params[1]).toBe("Encargado");
    expect(base.actual.sqlDe(/INSERT INTO rol_permiso/)[0]!.params[1]).toEqual(["ventas.registrar", "deposito.ingresos"]);
    expect(base.actual.sqlDe(/INSERT INTO evento/)[0]!.params[1]).toBe("rol.creado");
  });

  it("sin nombre, sin permisos o con un permiso que no existe, no se guarda; un nombre repetido, 409", async () => {
    for (const [cuerpo, mensaje] of [[{ nombre: " ", permisos: ["ventas.registrar"] }, "nombre"], [{ nombre: "X", permisos: [] }, "al menos un permiso"], [{ nombre: "X", permisos: ["inventado"] }, "No existe el permiso"]] as const) {
      const r = await pedir(app, "POST", "/roles", { rol: "admin", cuerpo });
      expect(r.status).toBe(400);
      expect(((await r.json()) as { error: string }).error).toContain(mensaje);
    }
    base.actual.programar(/INSERT INTO rol \(/, () => { throw Object.assign(new Error("duplicado"), { code: "23505" }); });
    const r = await pedir(app, "POST", "/roles", { rol: "admin", cuerpo: { nombre: "Vendedor", permisos: ["ventas.registrar"] } });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("Ya hay un rol que se llama Vendedor");
  });

  it("cambiar los permisos de un rol los reemplaza", async () => {
    const r = await pedir(app, "PATCH", `/roles/${ROL}`, { rol: "admin", cuerpo: { permisos: ["ventas.ver"] } });
    expect(r.status).toBe(204);
    expect(base.actual.sqlDe(/DELETE FROM rol_permiso WHERE rol_id/)[0]!.params).toEqual([ROL]);
    expect(base.actual.sqlDe(/INSERT INTO rol_permiso/)[0]!.params).toEqual([ROL, ["ventas.ver"]]);
  });

  it("un cambio de permisos no puede dejar al sistema sin quien administre, ni a quien lo hace", async () => {
    administran();
    const r = await pedir(app, "PATCH", `/roles/${ROL}`, { rol: "admin", cuerpo: { permisos: ["ventas.ver"] } });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("sin nadie que pueda administrar");
    administran("u-dueño");
    expect((await pedir(app, "PATCH", `/roles/${ROL}`, { rol: "admin", cuerpo: { permisos: ["ventas.ver"] } })).status).toBe(400);
    expect(base.actual.sqlDe(/^COMMIT/)).toHaveLength(0);
  });

  it("un rol que alguien tiene no se borra; uno libre sí", async () => {
    base.actual.programar(/SELECT r\.nombre, \(SELECT count/, { rows: [{ nombre: "Vendedor", usuarios: 2 }] });
    const r = await pedir(app, "DELETE", `/roles/${ROL}`, { rol: "admin" });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toContain("lo tienen 2 personas");
    expect(base.actual.sqlDe(/DELETE FROM rol WHERE id/)).toHaveLength(0);
    base.actual.programar(/SELECT r\.nombre, \(SELECT count/, { rows: [{ nombre: "Viejo", usuarios: 0 }] });
    expect((await pedir(app, "DELETE", `/roles/${ROL}`, { rol: "admin" })).status).toBe(204);
    expect(base.actual.sqlDe(/DELETE FROM rol WHERE id/)).toHaveLength(1);
  });
});

// Cada operación pide su permiso (RF-72): quien solo vende no puede lo demás.
describe("permisos por operación", () => {
  beforeEach(() => { base.actual = baseFalsa(); });
  const PROHIBIDO_AL_QUE_SOLO_VENDE: [string, string, string][] = [
    ["GET", "/ventas", "Ver las ventas del día"], ["POST", "/ventas/x/anular", "Anular ventas"],
    ["GET", "/listas", "Cargar listas de precios"], ["POST", "/proveedores", "Cargar listas de precios"],
    ["GET", "/equivalencias", "Unir duplicados"],
    ["POST", "/compras", "Registrar ingresos"], ["GET", "/compras", "Ver las compras"], ["GET", "/compras/semana", "Ver los números del negocio"],
    ["POST", "/stock/p1/ajustes", "Contar y corregir stock"], ["GET", "/sectores", "Contar y corregir stock"],
    ["GET", "/auditoria", "Ver quién hizo qué"], ["GET", "/anomalias", "Ver las anomalías"], ["GET", "/consultas", "Ver los números del negocio"],
    ["GET", "/usuarios", "Administrar usuarios"], ["GET", "/sesiones", "Administrar sesiones"], ["GET", "/roles", "Administrar roles"],
    ["PATCH", "/productos/p1", "Fijar márgenes"],
  ];
  it("sin el permiso, 403 diciendo cuál hace falta, y la sesión sigue", async () => {
    for (const [metodo, ruta, permiso] of PROHIBIDO_AL_QUE_SOLO_VENDE) {
      const r = await pedir(app, metodo, ruta, { rol: "soloVende", ...(metodo === "GET" ? {} : { cuerpo: { margen_elegido: 50 } }) });
      expect(r.status, `${metodo} ${ruta}`).toBe(403);
      expect(((await r.json()) as { error: string }).error, `${metodo} ${ruta}`).toContain(permiso);
    }
  });
  it("lo que no pide permiso anda con cualquier sesión: catálogo, stock, clientes, proveedores y tickets", async () => {
    for (const ruta of ["/productos", "/stock", "/clientes", "/proveedores", "/tickets", "/sesiones/actual"]) {
      expect((await pedir(app, "GET", ruta, { rol: "soloVende" })).status, ruta).toBe(200);
    }
  });
  it("el inventario no lleva dinero para quien no ve los números del negocio", async () => {
    base.actual.programar(/WITH movimientos AS/, { rows: [{ id: "p1", stock: "17", costo_neto: "1000", proveedor: "Comodo", valor: "17000", ultimo_movimiento: null }] });
    const sin = (await (await pedir(app, "GET", "/stock", { rol: "soloVende" })).json()) as { productos: { stock: string; costo_neto: unknown; valor: string }[]; valor_total: number; por_proveedor: object };
    expect(sin.productos[0]).toMatchObject({ stock: "17", costo_neto: null, valor: "0" });
    expect(sin.valor_total).toBe(0);
    expect(sin.por_proveedor).toEqual({});
    const con = (await (await pedir(app, "GET", "/stock", { rol: "dueño" })).json()) as { valor_total: number };
    expect(con.valor_total).toBe(17000);
  });
  it("todos los permisos de la lista se usan en alguna ruta de esta prueba o de las de roles", () => {
    const usados = new Set([...PROHIBIDO_AL_QUE_SOLO_VENDE.map(([, , nombre]) => nombre), "Vender"]);
    expect(PERMISOS.filter((p) => !usados.has(p.nombre)).map((p) => p.nombre)).toEqual([]);
  });
});
