import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../persistencia/pool.js", () => ({ get pool() { return base.actual.pool; } }));
const { app } = await import("../app.js");

// Lo apartado de alguien a quien desactivaron (specs/014-cambios-apartados, ADR-021).
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const ANA = "00000000-0000-0000-0000-0000000000a1";
const SESION_ANA = "00000000-0000-0000-0000-0000000000b1";
const PRODUCTO = "00000000-0000-0000-0000-0000000000c1";
const VENTA = { id: "00000000-0000-0000-0000-0000000000d1", medio_pago: "efectivo", fecha: "2026-10-17T08:47:00.000Z", items: [{ descripcion: "Candado bronce 40 mm", cantidad: 2, precio_unitario: 11000 }] };
const cambio = (o: Partial<{ orden: number; tipo: string; metodo: string; ruta: string; cuerpo: unknown }> = {}) =>
  ({ orden: 1_760_000_000_000_000, creado_en: "2026-10-17T08:47:00.000Z", tipo: "venta", metodo: "POST", ruta: "/ventas", cuerpo: VENTA, ...o });

function subir(cuerpo: unknown, token: string | null = "token-de-ana") {
  const cabeceras = new Headers({ "Content-Type": "application/json", "X-Token-Servicio": process.env.TOKEN_SERVICIO! });
  if (token) cabeceras.set("Authorization", `Bearer ${token}`);
  return app.request(new Request("http://api.prueba/apartados", { method: "POST", headers: cabeceras, body: JSON.stringify(cuerpo) }));
}
// La sesión del token de Ana: cerrada, y Ana activa o no.
const sesionDeAna = (activo: boolean) => base.actual.programar(/FROM usuario u JOIN sesion s/, (p) => ({ rows: p[0] === hash("token-de-ana") ? [{ id: SESION_ANA, usuario_id: ANA, activo }] : [] }));

// Comercial, de mentira (specs/029): lo apartado se repite ahí, por la red interna.
const comercial = (estado = 201, cuerpo: unknown = { id: VENTA.id }) => vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(cuerpo, { status: estado }));

describe("POST /apartados: el dispositivo sube lo que quedó sin mandar", () => {
  beforeEach(() => { base.actual = baseFalsa(); vi.restoreAllMocks(); comercial(); });

  it("014-E01 014-E02 014-E17: con la sesión cerrada de una persona desactivada, lo guarda apartado y no lo aplica", async () => {
    sesionDeAna(false);
    const r = await subir({ cambios: [cambio(), cambio({ orden: 2, tipo: "stock.ajuste", ruta: `/stock/${PRODUCTO}/ajustes`, cuerpo: { cantidad_real: 6, motivo: "conté" } })] });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ apartados: 2 });
    const guardados = base.actual.sqlDe(/insert into "cambio_apartado"/);
    expect(guardados).toHaveLength(2);
    // 014-E17: el mismo cambio que llega dos veces se guarda una sola vez.
    expect(guardados[0]!.sql).toMatch(/on conflict \("sesion_id", "orden"\) do nothing/);
    expect(guardados[0]!.params).toEqual(expect.arrayContaining([ANA, SESION_ANA, "venta", "POST", "/ventas", JSON.stringify(VENTA)]));
    // 014-E02: no se repitió nada en Comercial.
    expect(fetch).not.toHaveBeenCalled();
  });

  it("014-E03: si la persona sigue activa (le cerraron la sesión a distancia), 409 y no aparta nada", async () => {
    sesionDeAna(true);
    const r = await subir({ cambios: [cambio()] });
    expect(r.status).toBe(409);
    expect(base.actual.sqlDe(/insert into "cambio_apartado"/)).toHaveLength(0);
  });

  it("014-E04: sin token, o con uno que no es de ninguna sesión, 401", async () => {
    sesionDeAna(false);
    expect((await subir({ cambios: [cambio()] }, null)).status).toBe(401);
    expect((await subir({ cambios: [cambio()] }, "token-inventado")).status).toBe(401);
    expect(base.actual.sqlDe(/insert into "cambio_apartado"/)).toHaveLength(0);
  });

  it("014-E14: con la sesión cerrada no se puede hacer nada más", async () => {
    sesionDeAna(false);
    const cabeceras = new Headers({ Authorization: "Bearer token-de-ana", "Content-Type": "application/json", "X-Token-Servicio": process.env.TOKEN_SERVICIO! });
    const r = await app.request(new Request("http://api.prueba/sesiones/actual", { headers: cabeceras }));
    expect(r.status).toBe(401);
  });

  it("014-E15: un cambio de otro tipo, o que apunta a otra ruta que la de su tipo, rechaza el pedido entero", async () => {
    sesionDeAna(false);
    for (const malo of [cambio({ tipo: "usuario", ruta: "/usuarios" }), cambio({ ruta: "/usuarios" }), cambio({ tipo: "producto.cambio", metodo: "PATCH", ruta: `/productos/${PRODUCTO}/../../usuarios` }), cambio({ metodo: "DELETE" })]) {
      const r = await subir({ cambios: [cambio(), malo] });
      expect(r.status).toBe(400);
    }
    expect(base.actual.sqlDe(/insert into "cambio_apartado"/)).toHaveLength(0);
  });

  it("014-E16: más de 200 cambios en un pedido, 400", async () => {
    sesionDeAna(false);
    const r = await subir({ cambios: Array.from({ length: 201 }, (_, i) => cambio({ orden: i })) });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { error: string }).error).toMatch(/hasta 200/);
  });
});

describe("Para revisar: listar, aceptar y descartar", () => {
  beforeEach(() => { base.actual = baseFalsa(); vi.restoreAllMocks(); });
  const pendiente = { id: "apa-1", usuario_id: ANA, sesion_id: SESION_ANA, tipo: "venta", metodo: "POST", ruta: "/ventas", cuerpo: VENTA, decision: null, decidido_por: null };
  const programarPendiente = (fila: Record<string, unknown> = pendiente) => base.actual.programar(/from "cambio_apartado" as "a" left join "usuario" as "d"/, { rows: [fila] });
  // Ana, desactivada, con su rol de vendedora.
  const ana = (permisos = ["ventas.registrar"]) => base.actual.programar(/FROM usuario u WHERE u.id = \$1 AND NOT u.activo/, { rows: [{ id: ANA, email: "ana@ferre.test", nombre: "Ana López", roles: ["Vendedor"], permisos }] });

  it("014-E05: lista lo pendiente, de lo más viejo a lo más nuevo, con quién, el dispositivo y el producto", async () => {
    base.actual.programar(/from "cambio_apartado" as "a" inner join "usuario"/, { rows: [
      { id: "apa-1", tipo: "venta", usuario: "Ana López", dispositivo: "celular del mostrador", producto_id: null },
      { id: "apa-2", tipo: "stock.ajuste", usuario: "Ana López", dispositivo: "celular del mostrador", producto_id: PRODUCTO },
    ] });
    // El nombre del producto lo dice Comercial, preguntado con la identidad de quien mira (029).
    const productos = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ id: PRODUCTO, descripcion: "Tornillo 8x1" }]));
    const r = await pedir(app, "GET", "/apartados", { rol: "admin" });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { apartados: { producto: string | null }[] }).apartados.map((a) => a.producto)).toEqual([null, "Tornillo 8x1"]);
    expect(productos.mock.calls[0]![0]).toBe(`http://comercial.prueba/productos?ids=${PRODUCTO}`);
    // Si Comercial no responde, se lista igual, sin el nombre.
    productos.mockRejectedValue(new Error("caído"));
    expect(((await (await pedir(app, "GET", "/apartados", { rol: "admin" })).json()) as { apartados: { producto: string | null }[] }).apartados.map((a) => a.producto)).toEqual([null, null]);
    productos.mockResolvedValue(new Response("no", { status: 500 }));
    expect(((await (await pedir(app, "GET", "/apartados", { rol: "admin" })).json()) as { apartados: { producto: string | null }[] }).apartados.map((a) => a.producto)).toEqual([null, null]);
    const consulta = base.actual.sqlDe(/from "cambio_apartado" as "a" inner join "usuario"/)[0]!.sql;
    expect(consulta).toMatch(/"a"\."decision" is null/);
    expect(consulta).toMatch(/order by "a"\."hecho_en", "a"\."orden"/);
  });

  it("014-E06 029-E07: aceptar repite la venta en Comercial como Ana, con la fecha en que la cobró, y anota quién la aceptó", async () => {
    programarPendiente(); ana();
    const repetido = comercial();
    const r = await pedir(app, "POST", "/apartados/apa-1/aceptar", { rol: "admin" });
    expect(r.status).toBe(200);
    // El pedido original, en el servicio que lo atiende, con la identidad de Ana y la marca de apartado.
    const [url, init] = repetido.mock.calls[0]!;
    expect(url).toBe("http://comercial.prueba/ventas");
    expect(init).toMatchObject({ method: "POST", body: JSON.stringify(VENTA) });
    expect(init!.headers).toMatchObject({ "X-Usuario-Id": ANA, "X-Usuario-Nombre": encodeURIComponent("Ana López"), "X-Permisos": "ventas.registrar", "X-Apartado": "1", "X-Token-Servicio": process.env.TOKEN_SERVICIO });
    const eventos = base.actual.eventos();
    // Y la decisión, a nombre de quien aceptó.
    expect(base.actual.sqlDe(/update "cambio_apartado" set "decision"/)[0]!.params).toEqual(expect.arrayContaining(["aceptado", "u-admin"]));
    expect(eventos.some((e) => e.tipo === "apartado.aceptado" && e.quien?.id === "u-admin")).toBe(true);
    // El cambio se bloquea mientras se decide.
    expect(base.actual.sqlDe(/from "cambio_apartado" as "a" left join "usuario" as "d"/)[0]!.sql).toMatch(/for update of "a"/);
  });

  it("014-E07: descartar no registra nada y anota quién lo descartó", async () => {
    programarPendiente();
    const r = await pedir(app, "POST", "/apartados/apa-1/descartar", { rol: "admin" });
    expect(r.status).toBe(200);
    expect(base.actual.sqlDe(/insert into "venta"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/update "cambio_apartado" set "decision"/)[0]!.params).toEqual(expect.arrayContaining(["descartado", "u-admin"]));
    expect(base.actual.eventos().some((e) => e.tipo === "apartado.descartado")).toBe(true);
  });

  it("014-E01: la sesión cerrada sirve para subir hasta 30 días después de cerrada", async () => {
    sesionDeAna(false);
    await subir({ cambios: [cambio()] });
    expect(base.actual.sqlDe(/FROM usuario u JOIN sesion s/)[0]!.sql).toMatch(/COALESCE\(s\.revocada_en, s\.expira_en\) > now\(\) - interval '30 days'/);
  });

  it("014-E08 014-E19: si Comercial no lo acepta (un producto unido, Ana sin el permiso), sigue apartado y dice por qué", async () => {
    programarPendiente({ ...pendiente, cuerpo: { ...VENTA, items: [{ producto_id: PRODUCTO, descripcion: "Tornillo 8x1", cantidad: 3, precio_unitario: 1400 }] } }); ana([]);
    comercial(409, { error: "«Tornillo 8x1» se unió con «Tornillo autoperf. 8x1 punta mecha». Si querés, descartalo y cargalo de nuevo" });
    const r = await pedir(app, "POST", "/apartados/apa-1/aceptar", { rol: "admin" });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toBe("No se pudo aceptar: «Tornillo 8x1» se unió con «Tornillo autoperf. 8x1 punta mecha». Si querés, descartalo y cargalo de nuevo");
    comercial(500, "no es json");
    expect(((await (await pedir(app, "POST", "/apartados/apa-1/aceptar", { rol: "admin" })).json()) as { error: string }).error).toBe("No se pudo aceptar: el servidor contestó 500");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("caído"));
    expect(((await (await pedir(app, "POST", "/apartados/apa-1/aceptar", { rol: "admin" })).json()) as { error: string }).error).toBe("No se pudo aceptar: el servicio que lo atiende no respondió. Probá de nuevo en un rato");
    expect(base.actual.sqlDe(/update "cambio_apartado" set "decision"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/update "cambio_apartado" set "error"/)).toHaveLength(3);
  });

  it("014-E18: lo ya decidido no se decide de nuevo", async () => {
    programarPendiente({ ...pendiente, decision: "aceptado", decidido_por: "Marta" });
    for (const accion of ["aceptar", "descartar"]) {
      const r = await pedir(app, "POST", `/apartados/apa-1/${accion}`, { rol: "admin" });
      expect(r.status).toBe(409);
      expect(((await r.json()) as { error: string }).error).toBe("Ya se decidió: lo aceptó Marta");
    }
    expect(base.actual.sqlDe(/update "cambio_apartado"/)).toHaveLength(0);
  });

  it("014-E13: sin «Administrar usuarios», el servidor niega ver, aceptar y descartar", async () => {
    programarPendiente();
    for (const [metodo, ruta] of [["GET", "/apartados"], ["POST", "/apartados/apa-1/aceptar"], ["POST", "/apartados/apa-1/descartar"]] as const) {
      expect((await pedir(app, metodo, ruta, { rol: "mostrador" })).status).toBe(403);
    }
    expect(base.actual.sqlDe(/update "cambio_apartado"/)).toHaveLength(0);
  });
});
