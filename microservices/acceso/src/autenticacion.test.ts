import { generateKeyPairSync, sign } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OAuth2Client } from "google-auth-library";
import { emailVerificadoPorGoogle } from "./autenticacion.js";

// La verificación de la credencial de Google de verdad (RF-70), sin Google: las credenciales se
// firman acá con una clave de prueba, y la biblioteca de Google la recibe como si fuera una de
// las claves públicas que publica Google. Se prueba lo que hace la biblioteca con la firma, a
// quién va dirigida, quién la emitió y cuándo vence; la pantalla de Google queda a mano.
const clave = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otra = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = (k: typeof clave) => k.publicKey.export({ type: "spki", format: "pem" }).toString();
const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");

function credencial(datos: Record<string, unknown> = {}, firma = clave) {
  const ahora = Math.floor(Date.now() / 1000);
  const cuerpo = { iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID, sub: "1", email: "Carlos@Ferre.test", email_verified: true, iat: ahora, exp: ahora + 3600, ...datos };
  const sinFirma = `${b64({ alg: "RS256", kid: "prueba", typ: "JWT" })}.${b64(cuerpo)}`;
  return `${sinFirma}.${sign("RSA-SHA256", Buffer.from(sinFirma), firma.privateKey).toString("base64url")}`;
}

beforeEach(() => {
  // Las claves públicas de Google, que la biblioteca baja de internet: acá, solo la de prueba.
  vi.spyOn(OAuth2Client.prototype, "getFederatedSignonCertsAsync").mockResolvedValue({ certs: { prueba: pem(clave) }, format: "PEM" } as never);
});
afterEach(() => { vi.restoreAllMocks(); });

describe("la credencial que devuelve el botón de Google", () => {
  it("firmada por Google, para esta aplicación, vigente y con el correo verificado: da el correo, en minúsculas", async () => {
    expect(await emailVerificadoPorGoogle(credencial())).toBe("carlos@ferre.test");
  });

  it("no vale si la firmó otro", async () => {
    expect(await emailVerificadoPorGoogle(credencial({}, otra))).toBeNull();
  });

  it("no vale si es para otra aplicación", async () => {
    expect(await emailVerificadoPorGoogle(credencial({ aud: "otra-app.apps.googleusercontent.com" }))).toBeNull();
  });

  it("no vale si no la emitió Google", async () => {
    expect(await emailVerificadoPorGoogle(credencial({ iss: "https://otro.example" }))).toBeNull();
  });

  it("no vale si venció", async () => {
    const hace = Math.floor(Date.now() / 1000) - 7200;
    expect(await emailVerificadoPorGoogle(credencial({ iat: hace, exp: hace + 3600 }))).toBeNull();
  });

  it("no vale si se le cambió el correo después de firmarla", async () => {
    const [cabeza, , firma] = credencial().split(".");
    const otroCuerpo = b64({ iss: "https://accounts.google.com", aud: process.env.GOOGLE_CLIENT_ID, email: "intruso@ferre.test", email_verified: true, exp: Math.floor(Date.now() / 1000) + 3600 });
    expect(await emailVerificadoPorGoogle(`${cabeza}.${otroCuerpo}.${firma}`)).toBeNull();
  });

  it("no da el correo si Google no lo verificó, ni si no trae correo", async () => {
    expect(await emailVerificadoPorGoogle(credencial({ email_verified: false }))).toBeNull();
    expect(await emailVerificadoPorGoogle(credencial({ email: undefined }))).toBeNull();
  });

  it("no vale cualquier texto", async () => {
    expect(await emailVerificadoPorGoogle("no-es-una-credencial")).toBeNull();
  });
});
