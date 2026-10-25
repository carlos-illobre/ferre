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

describe("POST /apartados: el dispositivo sube lo que quedó sin mandar", () => {
  beforeEach(() => { base.actual = baseFalsa(); });

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
    // 014-E02: no se registró ninguna venta ni se tocó el stock.
    expect(base.actual.sqlDe(/insert into "venta"|movimiento_stock/)).toHaveLength(0);
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
    const r = await app.request(new Request("http://api.prueba/ventas", { method: "POST", headers: cabeceras, body: JSON.stringify(VENTA) }));
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
  beforeEach(() => { base.actual = baseFalsa(); });
  const pendiente = { id: "apa-1", usuario_id: ANA, sesion_id: SESION_ANA, tipo: "venta", metodo: "POST", ruta: "/ventas", cuerpo: VENTA, decision: null, decidido_por: null };
  const programarPendiente = (fila: Record<string, unknown> = pendiente) => base.actual.programar(/from "cambio_apartado" as "a" left join "usuario" as "d"/, { rows: [fila] });
  // Ana, desactivada, con su rol de vendedora.
  const ana = (permisos = ["ventas.registrar"]) => base.actual.programar(/FROM usuario u WHERE u.id = \$1 AND NOT u.activo/, { rows: [{ id: ANA, email: "ana@ferre.test", nombre: "Ana López", roles: ["Vendedor"], permisos }] });

  it("014-E05: lista lo pendiente, de lo más viejo a lo más nuevo, con quién, el dispositivo y el producto", async () => {
    base.actual.programar(/from "cambio_apartado" as "a" inner join "usuario"/, { rows: [{ id: "apa-1", tipo: "venta", usuario: "Ana López", dispositivo: "celular del mostrador" }] });
    const r = await pedir(app, "GET", "/apartados", { rol: "admin" });
    expect(r.status).toBe(200);
    expect(((await r.json()) as { apartados: unknown[] }).apartados).toHaveLength(1);
    const consulta = base.actual.sqlDe(/from "cambio_apartado" as "a" inner join "usuario"/)[0]!.sql;
    expect(consulta).toMatch(/"a"\."decision" is null/);
    expect(consulta).toMatch(/order by "a"\."hecho_en", "a"\."orden"/);
  });

  it("014-E06: aceptar repite la venta como Ana, con la fecha en que la cobró, y anota quién la aceptó", async () => {
    programarPendiente(); ana();
    const r = await pedir(app, "POST", "/apartados/apa-1/aceptar", { rol: "admin" });
    expect(r.status).toBe(200);
    const venta = base.actual.sqlDe(/insert into "venta"/)[0]!;
    expect(venta.params).toEqual(expect.arrayContaining([VENTA.id, VENTA.fecha]));
    // La venta queda a nombre de Ana: el evento de la venta es suyo.
    const eventos = base.actual.eventos();
    expect(eventos.some((e) => e.quien?.id === ANA && e.tipo.startsWith("venta"))).toBe(true);
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

  it("014-E08: una venta de un producto que se unió con otro no se registra, sigue apartada y dice con cuál se unió", async () => {
    programarPendiente({ ...pendiente, cuerpo: { ...VENTA, items: [{ producto_id: PRODUCTO, descripcion: "Tornillo 8x1", cantidad: 3, precio_unitario: 1400 }] } }); ana();
    base.actual.programar(/FROM producto p LEFT JOIN producto r ON r.id = p.reemplazado_por/, (p) => ({ rows: (p[0] as string[]).includes(PRODUCTO) ? [{ descripcion: "Tornillo 8x1", reemplazo: "Tornillo autoperf. 8x1 punta mecha" }] : [] }));
    const r = await pedir(app, "POST", "/apartados/apa-1/aceptar", { rol: "admin" });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toBe("No se pudo aceptar: «Tornillo 8x1» se unió con «Tornillo autoperf. 8x1 punta mecha». Si querés, descartalo y cargalo de nuevo");
    expect(base.actual.sqlDe(/insert into "venta"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/update "cambio_apartado" set "error"/)).toHaveLength(1);
  });

  it("014-E19: si la ruta no lo acepta (aquí, Ana ya no tiene el permiso), no se registra, sigue apartado y dice por qué", async () => {
    programarPendiente(); ana([]);
    const r = await pedir(app, "POST", "/apartados/apa-1/aceptar", { rol: "admin" });
    expect(r.status).toBe(409);
    expect(((await r.json()) as { error: string }).error).toMatch(/^No se pudo aceptar: No tenés permiso para esto/);
    expect(base.actual.sqlDe(/insert into "venta"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/update "cambio_apartado" set "decision"/)).toHaveLength(0);
    expect(base.actual.sqlDe(/update "cambio_apartado" set "error"/)).toHaveLength(1);
  });

  it("014-E18: lo ya decidido no se decide de nuevo", async () => {
    programarPendiente({ ...pendiente, decision: "aceptado", decidido_por: "Marta" });
    for (const accion of ["aceptar", "descartar"]) {
      const r = await pedir(app, "POST", `/apartados/apa-1/${accion}`, { rol: "admin" });
      expect(r.status).toBe(409);
      expect(((await r.json()) as { error: string }).error).toBe("Ya se decidió: lo aceptó Marta");
    }
    expect(base.actual.sqlDe(/insert into "venta"|update "cambio_apartado"/)).toHaveLength(0);
  });

  it("014-E13: sin «Administrar usuarios», el servidor niega ver, aceptar y descartar", async () => {
    programarPendiente();
    for (const [metodo, ruta] of [["GET", "/apartados"], ["POST", "/apartados/apa-1/aceptar"], ["POST", "/apartados/apa-1/descartar"]] as const) {
      expect((await pedir(app, metodo, ruta, { rol: "mostrador" })).status).toBe(403);
    }
    expect(base.actual.sqlDe(/update "cambio_apartado"/)).toHaveLength(0);
  });
});
