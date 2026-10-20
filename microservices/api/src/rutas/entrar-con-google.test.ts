import { beforeEach, describe, expect, it, vi } from "vitest";
import { baseFalsa, pedir } from "../pruebas/base-falsa.js";

const base = vi.hoisted(() => ({ actual: null as unknown as ReturnType<typeof import("../pruebas/base-falsa.js")["baseFalsa"]> }));
vi.mock("../db.js", () => ({ get pool() { return base.actual.pool; } }));
// Google de mentira (RF-70): la credencial «google:<correo>» la confirma Google con ese correo;
// «sin-verificar:<correo>» trae un correo que Google no verificó; cualquier otra no la reconoce.
// Lo que se prueba es qué hace Ferrebress con lo que Google confirma, no la pantalla de Google.
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    async verifyIdToken({ idToken }: { idToken: string }) {
      const [tipo, email] = idToken.split(":");
      if (tipo !== "google" && tipo !== "sin-verificar") throw new Error("Google no reconoce la credencial");
      return { getPayload: () => ({ email, email_verified: tipo === "google" }) };
    }
  },
}));
const { app } = await import("../app.js");

const AUTORIZADO = { id: "u-carlos", email: "carlos@ferre.test", nombre: "Carlos", roles: ["Administrador"], permisos: ["admin.usuarios"] };
const entrar = (credencial: string) => pedir(app, "POST", "/sesiones/google", { rol: null, cuerpo: { credencial, dispositivo: "celular · Chrome" } });

describe("entrar con Google", () => {
  beforeEach(() => {
    base.actual = baseFalsa();
    // Solo carlos@ferre.test está autorizado y activo.
    base.actual.programar(/FROM usuario WHERE email = \$1 AND activo/, (p) => ({ rows: p[0] === AUTORIZADO.email ? [{ id: AUTORIZADO.id }] : [] }));
    base.actual.programar(/FROM usuario u WHERE u.id = \$1 AND u.activo/, (p) => ({ rows: p[0] === AUTORIZADO.id ? [AUTORIZADO] : [] }));
  });

  it("la aplicación pide el identificador de Google sin sesión, y es el mismo con el que se verifican las credenciales", async () => {
    const r = await pedir(app, "GET", "/sesiones/google/cliente", { rol: null });
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ clienteId: process.env.GOOGLE_CLIENT_ID });
  });

  it("A2: con un correo autorizado se abre una sesión en ese dispositivo y queda registrado que fue con Google", async () => {
    const r = await entrar("google:Carlos@Ferre.test");
    expect(r.status).toBe(201);
    const cuerpo = (await r.json()) as { token: string; usuario: { nombre: string } };
    expect(cuerpo.token.length).toBeGreaterThan(20);
    expect(cuerpo.usuario.nombre).toBe("Carlos");
    // Mayúsculas y minúsculas no distinguen un correo de otro.
    expect(base.actual.sqlDe(/FROM usuario WHERE email/)[0]!.params).toEqual(["carlos@ferre.test"]);
    expect(base.actual.sqlDe(/INSERT INTO sesion/)).toHaveLength(1);
    expect(JSON.parse(String(base.actual.sqlDe(/INSERT INTO evento/)[0]!.params.at(-1)))).toMatchObject({ medio: "google" });
  });

  it("A5: un correo que nadie autorizó no entra, y el error dice cuál es", async () => {
    const r = await entrar("google:extrano@gmail.com");
    expect(r.status).toBe(403);
    expect(((await r.json()) as { error: string }).error).toContain("extrano@gmail.com no está autorizado");
    expect(base.actual.sqlDe(/INSERT INTO sesion/)).toHaveLength(0);
  });

  it("A6: un usuario desactivado no entra: solo se buscan los activos", async () => {
    base.actual.programar(/FROM usuario WHERE email = \$1 AND activo/, { rows: [] });
    expect((await entrar("google:carlos@ferre.test")).status).toBe(403);
    expect(base.actual.sqlDe(/INSERT INTO sesion/)).toHaveLength(0);
  });

  it("una credencial que Google no reconoce, o con el correo sin verificar, no abre sesión", async () => {
    for (const credencial of ["inventada", "sin-verificar:carlos@ferre.test"]) {
      const r = await entrar(credencial);
      expect(r.status).toBe(401);
      expect(((await r.json()) as { error: string }).error).toBe("Google no pudo verificar la cuenta");
    }
    expect(base.actual.sqlDe(/INSERT INTO sesion/)).toHaveLength(0);
  });
});
