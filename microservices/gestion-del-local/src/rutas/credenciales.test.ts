import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; }, baseResponde: async () => true }));
// La criptografía la hace la librería (probada por sus autores); acá se prueba el
// circuito: desafío de un solo uso, alta, listado, baja, login y sesión.
const verificar = vi.hoisted(() => ({ registro: vi.fn(), login: vi.fn() }));
vi.mock("@simplewebauthn/server", async (original) => {
  const real = await original<typeof import("@simplewebauthn/server")>();
  return { ...real, verifyRegistrationResponse: (...a: unknown[]) => verificar.registro(...a), verifyAuthenticationResponse: (...a: unknown[]) => verificar.login(...a) };
});
const { app } = await import("../app.js");

const clave = Buffer.from("clave-publica");
describe("passkeys", () => {
  beforeEach(() => { base.actual = baseFalsa(); verificar.registro.mockReset(); verificar.login.mockReset(); });

  it("vincular: opciones atadas al dominio del cliente, con clave descubrible y huella obligatoria", async () => {
    const r = await pedir(app, "POST", "/credenciales/registro/opciones", { rol: "mostrador", cuerpo: {} });
    expect(r.status).toBe(200);
    const { desafioId, opciones } = (await r.json()) as { desafioId: string; opciones: Record<string, unknown> };
    expect(desafioId).toBeTruthy();
    expect(opciones.rp).toEqual({ name: "ferre", id: "web.prueba" });
    expect(opciones.authenticatorSelection).toMatchObject({ residentKey: "required", userVerification: "required" });
    expect((opciones.user as { name: string }).name).toBe("mostrador@ferre.test");
  });

  it("vincular: guarda la clave pública y el desafío se usa una sola vez", async () => {
    const { desafioId } = (await (await pedir(app, "POST", "/credenciales/registro/opciones", { rol: "mostrador", cuerpo: {} })).json()) as { desafioId: string };
    verificar.registro.mockResolvedValue({ verified: true, registrationInfo: { credentialDeviceType: "multiDevice", credential: { id: "cred-1", publicKey: new Uint8Array(clave), counter: 0, transports: ["internal"] } } });
    const r = await pedir(app, "POST", "/credenciales/registro", { rol: "mostrador", cuerpo: { desafioId, respuesta: { id: "cred-1" }, dispositivo: "Celular de Carlos" } });
    expect(r.status).toBe(201);
    expect(await r.json()).toEqual({ id: "cred-1", dispositivo: "Celular de Carlos" });
    expect(verificar.registro.mock.calls[0]![0]).toMatchObject({ expectedOrigin: "http://web.prueba", expectedRPID: "web.prueba", requireUserVerification: true });
    const insert = base.actual.sqlDe(/INSERT INTO credencial/)[0]!;
    expect(insert.params).toEqual(["cred-1", "u-mostrador", clave, 0, ["internal"], "Celular de Carlos"]);
    expect(base.actual.sqlDe(/INSERT INTO evento/).at(-1)!.params[1]).toBe("credencial.vinculada");
    // el mismo desafío no sirve dos veces, ni sin sesión
    expect((await pedir(app, "POST", "/credenciales/registro", { rol: "mostrador", cuerpo: { desafioId, respuesta: { id: "cred-1" } } })).status).toBe(400);
    expect((await pedir(app, "POST", "/credenciales/registro/opciones", { rol: null, cuerpo: {} })).status).toBe(401);
  });

  it("vincular: el desafío de otro usuario no vale", async () => {
    const { desafioId } = (await (await pedir(app, "POST", "/credenciales/registro/opciones", { rol: "mostrador", cuerpo: {} })).json()) as { desafioId: string };
    expect((await pedir(app, "POST", "/credenciales/registro", { rol: "admin", cuerpo: { desafioId, respuesta: { id: "x" } } })).status).toBe(400);
    expect(verificar.registro).not.toHaveBeenCalled();
  });

  it("entrar con la huella abre una sesión y sube el contador; un celular desconocido no entra", async () => {
    const { desafioId, opciones } = (await (await pedir(app, "POST", "/credenciales/login/opciones", { rol: null, cuerpo: {} })).json()) as { desafioId: string; opciones: Record<string, unknown> };
    expect(opciones.userVerification).toBe("required");
    expect(opciones.rpId).toBe("web.prueba");
    base.actual.programar(/FROM credencial cr JOIN usuario u/, (p) => ({ rows: p[0] === "cred-1" ? [{ id: "cred-1", usuario_id: "u-mostrador", clave_publica: clave, contador: "3", transportes: ["internal"], dispositivo: "Celular de Carlos", email: "mostrador@ferre.test", nombre: "Mostrador", rol: "mostrador", activo: true }] : [] }));
    verificar.login.mockResolvedValue({ verified: true, authenticationInfo: { newCounter: 4 } });
    const r = await pedir(app, "POST", "/credenciales/login", { rol: null, cuerpo: { desafioId, respuesta: { id: "cred-1" } } });
    expect(r.status).toBe(201);
    const cuerpo = (await r.json()) as { token: string; usuario: { id: string; rol: string } };
    expect(cuerpo.token.length).toBeGreaterThan(20);
    expect(cuerpo.usuario).toMatchObject({ id: "u-mostrador", rol: "mostrador" });
    expect(verificar.login.mock.calls[0]![0]).toMatchObject({ credential: { id: "cred-1", counter: 3 }, requireUserVerification: true });
    expect(base.actual.sqlDe(/UPDATE credencial SET contador/)[0]!.params).toEqual(["cred-1", 4]);
    expect(base.actual.sqlDe(/INSERT INTO sesion/)).toHaveLength(1);
    expect(base.actual.sqlDe(/INSERT INTO evento/).at(-1)!.params[1]).toBe("sesion.iniciada");
    // desconocido
    const { desafioId: d2 } = (await (await pedir(app, "POST", "/credenciales/login/opciones", { rol: null, cuerpo: {} })).json()) as { desafioId: string };
    const r2 = await pedir(app, "POST", "/credenciales/login", { rol: null, cuerpo: { desafioId: d2, respuesta: { id: "otra" } } });
    expect(r2.status).toBe(401);
    expect(((await r2.json()) as { error: string }).error).toContain("no está vinculado");
  });

  it("entrar: usuario desactivado 403; firma inválida 401; desafío vencido o repetido 400", async () => {
    base.actual.programar(/FROM credencial cr JOIN usuario u/, { rows: [{ id: "cred-1", usuario_id: "u-mostrador", clave_publica: clave, contador: "0", transportes: [], dispositivo: null, email: "m@f", nombre: "M", rol: "mostrador", activo: false }] });
    let { desafioId } = (await (await pedir(app, "POST", "/credenciales/login/opciones", { rol: null, cuerpo: {} })).json()) as { desafioId: string };
    expect((await pedir(app, "POST", "/credenciales/login", { rol: null, cuerpo: { desafioId, respuesta: { id: "cred-1" } } })).status).toBe(403);
    base.actual.programar(/FROM credencial cr JOIN usuario u/, { rows: [{ id: "cred-1", usuario_id: "u-mostrador", clave_publica: clave, contador: "0", transportes: [], dispositivo: null, email: "m@f", nombre: "M", rol: "mostrador", activo: true }] });
    verificar.login.mockRejectedValue(new Error("firma inválida"));
    ({ desafioId } = (await (await pedir(app, "POST", "/credenciales/login/opciones", { rol: null, cuerpo: {} })).json()) as { desafioId: string });
    expect((await pedir(app, "POST", "/credenciales/login", { rol: null, cuerpo: { desafioId, respuesta: { id: "cred-1" } } })).status).toBe(401);
    expect((await pedir(app, "POST", "/credenciales/login", { rol: null, cuerpo: { desafioId, respuesta: { id: "cred-1" } } })).status).toBe(400);
    expect((await pedir(app, "POST", "/credenciales/login", { rol: null, cuerpo: { desafioId: "no-existe", respuesta: { id: "cred-1" } } })).status).toBe(400);
  });

  it("listar y quitar: cada uno los suyos; el admin puede quitar cualquiera", async () => {
    base.actual.programar(/SELECT id, dispositivo, creada_en, ultimo_uso_en FROM credencial/, { rows: [{ id: "cred-1", dispositivo: "Celular", creada_en: "2026-09-14", ultimo_uso_en: null }] });
    expect(await (await pedir(app, "GET", "/credenciales", { rol: "mostrador" })).json()).toEqual([{ id: "cred-1", dispositivo: "Celular", creada_en: "2026-09-14", ultimo_uso_en: null }]);
    base.actual.programar(/UPDATE credencial SET revocada_en/, (p) => ({ rowCount: p[2] === true || p[1] === "u-mostrador" ? 1 : 0 }));
    expect((await pedir(app, "DELETE", "/credenciales/cred-1", { rol: "mostrador" })).status).toBe(204);
    expect((await pedir(app, "DELETE", "/credenciales/cred-1", { rol: "admin" })).status).toBe(204);
    expect(base.actual.sqlDe(/UPDATE credencial SET revocada_en/)[1]!.params).toEqual(["cred-1", "u-admin", true]);
  });
});
