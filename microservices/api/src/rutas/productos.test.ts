import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

// El catálogo sale de la copia del servidor (specs/018, RF-122, RF-124): ninguna búsqueda lee
// productos de la base; de la base se lee solo el stock de la página.
const { cargarParaPrueba } = await import("../productos/copia.js");
const ID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const CATALOGO = [
  { id: ID(1), descripcion: "Tornillo autoperforante 8 x 1", marca: "Fischer", codigo_barras: "7790000000011", codigos: ["TA-81"] },
  { id: ID(2), descripcion: "Mecha 8 mm madera", marca: "Bosch", codigo_barras: null, codigos: ["VIEJO8", "M8"] },
  { id: ID(3), descripcion: "Mecha 8 mm acero rápido HSS", marca: "bosch", codigo_barras: "7790000000035", codigos: [] },
  { id: ID(4), descripcion: "Cinta métrica 5 m", marca: null, codigo_barras: null, codigos: [] },
  { id: ID(5), descripcion: "Taladro (dado de baja)", marca: "Bosch", vigente: false },
  ...Array.from({ length: 120 }, (_, i) => ({ id: ID(100 + i), descripcion: `Tuerca ${String(i).padStart(3, "0")}`, marca: "Genérica", codigo_barras: null, codigos: [] })),
];
const productosDeLaBase = () => base.actual.sqlDe(/FROM producto|precio_proveedor/);
type Pagina = { productos: { id: string; descripcion: string; precio: number | null }[]; stock: Record<string, string>; hay_mas: boolean; total: number };
const pagina = async (consulta: string, rol: "mostrador" | null = "mostrador") => (await pedir(app, "GET", `/productos/pagina${consulta}`, { rol })).json() as Promise<Pagina>;

describe("GET /productos/pagina", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    cargarParaPrueba(CATALOGO);
    base.actual.programar(/from "movimiento_stock".*group by "producto_id"$/i, { rows: [{ producto_id: ID(2), stock: "12" }] });
  });

  it("018-E01 018-E14: los primeros 50 en orden alfabético, con el stock de esa página; ningún producto se lee de la base", async () => {
    const r = await pagina("");
    expect(r.productos).toHaveLength(50);
    expect(r.productos.slice(0, 3).map((p) => p.descripcion)).toEqual(["Cinta métrica 5 m", "Mecha 8 mm acero rápido HSS", "Mecha 8 mm madera"]);
    expect(r.productos.some((p) => p.id === ID(5))).toBe(false);
    expect(r.stock).toEqual({ [ID(2)]: "12" });
    expect(r.hay_mas).toBe(true);
    expect(r.total).toBe(124);
    expect(productosDeLaBase()).toHaveLength(0);
    const stock = base.actual.sqlDe(/movimiento_stock/);
    expect(stock).toHaveLength(1);
    expect(stock[0]!.params).toHaveLength(50);
  });

  it("018-E02: los siguientes desde donde quedó; al final, ninguno más", async () => {
    const segunda = await pagina("?desde=50");
    expect(segunda.productos[0]!.descripcion).toBe("Tuerca 046");
    const ultima = await pagina("?desde=100");
    expect(ultima.productos).toHaveLength(24);
    expect(ultima.hay_mas).toBe(false);
    expect((await pagina("?limite=5000")).productos).toHaveLength(124); // hasta 200 por página
    expect((await pagina("?limite=abc")).productos).toHaveLength(50);
  });

  it("018-E03: cada palabra es el comienzo de una palabra o de un código; sin acentos ni mayúsculas; las más cortas primero", async () => {
    expect((await pagina("?buscar=mecha%208")).productos.map((p) => p.id)).toEqual([ID(2), ID(3)]);
    expect((await pagina("?buscar=METRICA")).productos.map((p) => p.id)).toEqual([ID(4)]);
    expect((await pagina("?buscar=bosch%20acero")).productos.map((p) => p.id)).toEqual([ID(3)]);
    expect((await pagina("?buscar=viejo8")).productos.map((p) => p.id)).toEqual([ID(2)]); // un código de una lista vieja
    expect((await pagina("?buscar=779000000001")).productos.map((p) => p.id)).toEqual([ID(1)]);
    expect((await pagina("?buscar=echa")).productos).toEqual([]);
    const raro = await pedir(app, "GET", "/productos/pagina?buscar=" + encodeURIComponent("Mechá 8mm'; DROP TABLE producto;--"), { rol: "mostrador" });
    expect(raro.status).toBe(200);
    expect(base.actual.consultas.some((c) => /DROP/i.test(c.sql))).toBe(false);
  });

  it("018-E04: un código exacto, de barras o de proveedor; si no existe, nada", async () => {
    expect((await pagina("?codigo=7790000000035")).productos.map((p) => p.id)).toEqual([ID(3)]);
    expect((await pagina("?codigo=TA-81")).productos.map((p) => p.id)).toEqual([ID(1)]);
    expect((await pagina("?codigo=no-existe")).productos).toEqual([]);
  });

  it("018-E05: filtrar por marca (sin importar mayúsculas) y por stock; las marcas, sin repetir", async () => {
    expect((await pagina("?marca=BOSCH")).productos.map((p) => p.id)).toEqual([ID(3), ID(2)]);
    base.actual.programar(/having/i, { rows: [{ producto_id: ID(2) }] });
    expect((await pagina("?disponibilidad=con-stock")).productos.map((p) => p.id)).toEqual([ID(2)]);
    expect((await pagina("?disponibilidad=sin-stock&buscar=mecha")).productos.map((p) => p.id)).toEqual([ID(3)]);
    expect(await (await pedir(app, "GET", "/productos/marcas", { rol: "mostrador" })).json()).toEqual(["bosch", "Fischer", "Genérica"]); // como se escribió en el primero, por descripción
    // 015-E29: con una búsqueda, las marcas de lo encontrado; el total cuenta con los filtros.
    expect(await (await pedir(app, "GET", "/productos/marcas?buscar=mecha", { rol: "mostrador" })).json()).toEqual(["Bosch"]);
    expect((await pagina("?marca=bosch&limite=1")).total).toBe(2);
  });

  it("018-E06: productos puntuales por identificador; los que no tienen forma de identificador se ignoran; una lista vacía no trae nada", async () => {
    expect((await pagina(`?ids=${ID(4)},no-es-un-id,${ID(1)}`)).productos.map((p) => p.id)).toEqual([ID(4), ID(1)]);
    expect((await pagina("?ids=")).productos).toEqual([]);
  });

  it("el resumen: cuántos productos hay y cuántos tienen costo sin margen", async () => {
    cargarParaPrueba([{ id: "a", descripcion: "A", costo_neto: "10", margen_elegido: null }, { id: "b", descripcion: "B", costo_neto: "10", margen_elegido: 50 }, { id: "c", descripcion: "C", costo_neto: null, margen_elegido: null }]);
    expect(await (await pedir(app, "GET", "/productos/resumen", { rol: "mostrador" })).json()).toEqual({ productos: 3, sin_margen: 1 });
  });

  it("sin sesión, 401", async () => {
    expect((await pedir(app, "GET", "/productos/pagina", { rol: null })).status).toBe(401);
    expect((await pedir(app, "GET", "/productos/resumen", { rol: null })).status).toBe(401);
    expect((await pedir(app, "GET", "/productos/marcas", { rol: null })).status).toBe(401);
  });
});

describe("GET /productos/descarga (specs/018, historia 5)", () => {
  beforeEach(() => { base.actual = baseFalsa(); });
  type Descarga = { productos: { id: string }[]; quitados: string[]; hay_mas: boolean; siguiente: string | null; marca: string };
  const bajar = async (q: string) => (await pedir(app, "GET", `/productos/descarga${q}`, { rol: "mostrador" })).json() as Promise<Descarga>;

  it("018-E24: la primera vez, todo lo vigente de a páginas por identificador, sin leer la base", async () => {
    cargarParaPrueba(CATALOGO);
    const primera = await bajar("?limite=100");
    expect(primera.productos).toHaveLength(100);
    expect(primera.hay_mas).toBe(true);
    expect(primera.marca).toBe("1");
    const segunda = await bajar(`?limite=100&desde=${primera.siguiente}`);
    expect(segunda.productos).toHaveLength(24);
    expect(segunda.hay_mas).toBe(false);
    expect([...primera.productos, ...segunda.productos].some((p) => p.id === ID(5))).toBe(false); // el dado de baja no
    expect(productosDeLaBase()).toHaveLength(0);
  });

  it("018-E25: con la marca anterior, solo lo que cambió desde entonces; lo dado de baja, para borrar", async () => {
    cargarParaPrueba([
      { id: ID(1), descripcion: "Viejo", cambio: null },
      { id: ID(2), descripcion: "Cambió antes", cambio: "90" },
      { id: ID(3), descripcion: "Cambió después", cambio: "120" },
      { id: ID(4), descripcion: "Se unió a otro", cambio: "130", vigente: false },
    ]);
    const d = await bajar("?marca=100");
    expect(d.productos.map((p) => p.id)).toEqual([ID(3)]);
    expect(d.quitados).toEqual([ID(4)]);
    expect((await bajar("?marca=no-es-una-marca")).productos).toHaveLength(3); // una marca rara vale como ninguna: todo
    expect((await bajar("?marca=99999999999999999999")).productos).toHaveLength(3); // y una que no entra en un xid8, también
  });

  it("018-E26: cada producto con todos sus códigos de proveedor, y la versión del cálculo del precio", async () => {
    cargarParaPrueba([{ id: ID(1), descripcion: "Mecha", codigos: ["VIEJO", "NUEVO"] }]);
    const d = (await bajar("")) as Descarga & { productos: { codigos: string[] }[]; calculo: string };
    expect(d.productos[0]!.codigos).toEqual(["VIEJO", "NUEVO"]);
    expect(d.calculo).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("sin sesión, 401", async () => {
    cargarParaPrueba(CATALOGO);
    expect((await pedir(app, "GET", "/productos/descarga", { rol: null })).status).toBe(401);
  });
});

describe("primero los del proveedor elegido (Pedidos e Ingreso)", () => {
  beforeEach(() => { base.actual = baseFalsa(); });
  it("con `primero`, los que tienen un costo de ese proveedor van adelante, sobre todo lo encontrado", async () => {
    const PROV = "00000000-0000-0000-0000-0000000000aa";
    cargarParaPrueba([
      ...Array.from({ length: 60 }, (_, i) => ({ id: ID(200 + i), descripcion: `Tornillo ${String(i).padStart(2, "0")}` })),
      { id: ID(300), descripcion: "Tornillo del proveedor elegido", proveedores: [{ proveedor_id: PROV, proveedor: "P", costo_neto: "1", fecha_lista: "2026-01-01", codigo_proveedor: "X" }] },
    ]);
    const r = await pagina(`?buscar=tornillo&primero=${PROV}`);
    expect(r.productos[0]!.id).toBe(ID(300));
    expect((await pagina("?buscar=tornillo&primero=no-es-un-id")).productos.some((p) => p.id === ID(300))).toBe(false); // sin primero, quedaba en el puesto 61
  });
});

describe("GET /productos (la aplicación de la versión anterior)", () => {
  beforeEach(() => { base.actual = baseFalsa(); cargarParaPrueba(CATALOGO); });

  it("018-E07: un producto llega con los mismos datos por página, por código y como antes, para cualquier sesión", async () => {
    const antes = (await (await pedir(app, "GET", "/productos")).json() as { id: string }[]).find((p) => p.id === ID(1));
    for (const rol of ["mostrador", "dueño"] as const) {
      const porIds = (await (await pedir(app, "GET", `/productos/pagina?ids=${ID(1)}`, { rol })).json() as Pagina).productos[0];
      const porCodigo = (await (await pedir(app, "GET", "/productos/pagina?codigo=TA-81", { rol })).json() as Pagina).productos[0];
      expect(porIds).toEqual(antes);
      expect(porCodigo).toEqual(antes);
    }
  });

  it("sin `limite`, todo; con `limite` y `desde`, esa tanda; desde la copia", async () => {
    expect(await (await pedir(app, "GET", "/productos")).json()).toHaveLength(124);
    const tanda = await (await pedir(app, "GET", "/productos?limite=2&desde=1")).json() as { id: string }[];
    expect(tanda.map((p) => p.id)).toEqual([ID(3), ID(2)]);
    expect(await (await pedir(app, "GET", "/productos?limite=abc")).json()).toHaveLength(124);
    expect(productosDeLaBase()).toHaveLength(0);
  });
});

describe("el precio que manda el servidor (010-E06)", () => {
  it("cada producto llega con su precio calculado, su explicación y el de los cinco márgenes", async () => {
    const { conPrecio } = await import("./productos.js");
    const p = conPrecio({ id: "a", costo_neto: "1649.14", iva: "0.21", margen_elegido: 100 });
    expect(p.precio).toBe(4000);
    expect(p.margen_del_precio).toBe(100);
    expect(p.explicacion_precio).toEqual(["Costo $1.649,14", "+ 100 % de margen = $3.298,28", "+ IVA 21 % = $3.990,92", "Redondeado para arriba a $4.000,00 (múltiplo de $1.000,00)"]);
    expect(p.precios).toEqual({ 300: 8000, 200: 6000, 100: 4000, 50: 3000, 25: 3000 });
  });
  it("sin margen llegan solo los de los botones; sin costo, ningún precio", async () => {
    const { conPrecio } = await import("./productos.js");
    expect(conPrecio({ costo_neto: "1000", iva: null, margen_elegido: null })).toMatchObject({ precio: null, explicacion_precio: [], margen_del_precio: null, precios: { 100: 3000 } });
    expect(conPrecio({ costo_neto: null, iva: null, margen_elegido: 100 })).toMatchObject({ precio: null, precios: null });
  });
  it("la ruta los agrega a cada producto del catálogo", async () => {
    base.actual = baseFalsa();
    cargarParaPrueba([{ id: "a", descripcion: "A", costo_neto: "1000", iva: "0.21", margen_elegido: 50 }]);
    const r = await pedir(app, "GET", "/productos/pagina");
    const p = ((await r.json()) as Pagina).productos[0]!;
    expect(p).toMatchObject({ id: "a", precio: 2000, margen_del_precio: 50 });
    expect(p).not.toHaveProperty("codigos");
    expect(p).not.toHaveProperty("vigente");
  });
});

describe("PATCH /productos/:id", () => {
  beforeEach(() => { base.actual = baseFalsa(); base.actual.programar(/UPDATE producto SET/, { rowCount: 1 }); });

  it("sin sesión, 401", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { rol: null, cuerpo: { margen_elegido: 100 } })).status).toBe(401);
  });

  it("el margen es cualquier porcentaje entero mayor que cero, o ninguno", async () => {
    for (const m of [100, 20, 1, 10000, null]) {
      const r = await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: m } });
      expect(r.status, `margen ${m}`).toBe(204);
    }
    for (const m of [1.5, 0, -10, 10001, "20"]) {
      const r = await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: m } });
      expect(r.status, `margen ${m}`).toBe(400);
    }
    const update = base.actual.sqlDe(/UPDATE producto SET margen_elegido/)[0]!;
    expect(update.params).toEqual(["p1", 100]);
  });

  it("la unidad es unidad, kg, m o l", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { unidad: "kg" } })).status).toBe(204);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { unidad: "caja" } })).status).toBe(400);
  });

  it("la foto es una dirección https o una subida a la API", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { foto_url: "https://fotos/x.jpg" } })).status).toBe(204);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { foto_url: "/fotos/abc.jpg" } })).status).toBe(204);
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: { foto_url: "javascript:alert(1)" } })).status).toBe(400);
  });

  it("sin nada que cambiar, 400; producto inexistente, 404; y queda auditado", async () => {
    expect((await pedir(app, "PATCH", "/productos/p1", { cuerpo: {} })).status).toBe(400);
    base.actual.programar(/UPDATE producto SET/, { rowCount: 0 });
    expect((await pedir(app, "PATCH", "/productos/nadie", { cuerpo: { margen_elegido: 50 } })).status).toBe(404);
    base.actual.programar(/UPDATE producto SET/, { rowCount: 1 });
    await pedir(app, "PATCH", "/productos/p1", { rol: "mostrador", cuerpo: { margen_elegido: 50 } });
    const evento = base.actual.sqlDe(/INSERT INTO evento/).at(-1)!;
    expect(evento.params[1]).toBe("producto.precio_elegido");
    expect(evento.params[4]).toBe("u-mostrador");
  });
});

describe("fotos de productos", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

  it("se sube desde el celular, se guarda con nombre al azar y se sirve sin sesión", async () => {
    base.actual.programar(/UPDATE producto SET foto_url/, { rowCount: 1 });
    const formulario = new FormData();
    formulario.append("foto", new File([Buffer.from("imagen-de-prueba")], "foto.jpg", { type: "image/jpeg" }));
    const r = await pedir(app, "POST", "/productos/p1/foto", { rol: "mostrador", formulario });
    expect(r.status).toBe(200);
    const { foto_url } = (await r.json()) as { foto_url: string };
    expect(foto_url).toMatch(/^\/fotos\/[0-9a-f-]{36}\.jpg$/);
    expect(await readFile(path.join(process.env.CARPETA_LISTAS!, "fotos", path.basename(foto_url)), "utf8")).toBe("imagen-de-prueba");
    const servida = await pedir(app, "GET", foto_url, { rol: null });
    expect(servida.status).toBe(200);
    expect(servida.headers.get("content-type")).toBe("image/jpeg");
    expect(await servida.text()).toBe("imagen-de-prueba");
  });

  it("rechaza lo que no es una imagen y nombres raros", async () => {
    const formulario = new FormData();
    formulario.append("foto", new File(["x"], "virus.exe", { type: "application/octet-stream" }));
    expect((await pedir(app, "POST", "/productos/p1/foto", { formulario })).status).toBe(400);
    expect((await pedir(app, "POST", "/productos/p1/foto", { formulario: new FormData() })).status).toBe(400);
    expect((await pedir(app, "GET", "/fotos/../../.env", { rol: null })).status).toBe(404);
    expect((await pedir(app, "GET", "/fotos/00000000-0000-0000-0000-000000000000.jpg", { rol: null })).status).toBe(404);
  });
});
