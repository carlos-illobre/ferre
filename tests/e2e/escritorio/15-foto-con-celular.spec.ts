import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// La computadora no tiene cámara (ADR-016): en el ingreso pide la foto de la factura, muestra
// un código QR, el celular abre el enlace del código, saca la foto y la foto aparece sola en
// la computadora.
const TOKEN = "token-e2e-foto-qr";
const EMAIL = "e2e-foto-qr@ferre.test";
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  const delUsuario = `(SELECT id FROM usuario WHERE email = '${EMAIL}')`;
  psql(`DELETE FROM foto_comprobante WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM sesion WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM evento WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Foto QR E2E', 'mostrador')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
});

test("la computadora pide la foto de la factura con un código QR y el celular la manda", async ({ page, browser }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/compras");
  await page.getByTestId("foto-con-celular").click();
  await expect(page.getByTestId("pedido-de-foto").getByRole("img", { name: "Código para sacar la foto con el celular" })).toBeVisible();
  // El enlace que lleva el código QR (lo deja la página para poder probar sin cámara).
  const enlace = await page.evaluate(() => (window as unknown as { __enlaceDeFoto: string }).__enlaceDeFoto);
  expect(enlace).toContain("#/foto?codigo=");

  // El celular, con su sesión, abre el enlace, saca la foto y la manda.
  const celular = await browser.newContext({ viewport: { width: 412, height: 915 } });
  const telefono = await celular.newPage();
  await telefono.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await telefono.goto(enlace);
  await expect(telefono.getByTestId("foto-para-la-compu")).toContainText("la foto de la factura");
  await telefono.getByTestId("archivo-para-la-compu").setInputFiles({ name: "factura.png", mimeType: "image/png", buffer: FOTO });
  await expect(telefono.getByRole("status")).toContainText("ya está en la computadora");

  // En la computadora la foto aparece sola y queda lista para leerla.
  await expect(page.getByTestId("foto-comprobante")).toContainText("Foto de la factura cargada", { timeout: 15000 });
  await page.getByTestId("foto-comprobante").getByTestId("ver-comprobante").click();
  await expect(page.getByRole("dialog", { name: "Foto de la factura" })).toBeVisible();
  expect(psql(`SELECT count(*) FROM foto_comprobante WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`)).toBe("1");

  // Un código que ya se usó no sirve para otra foto.
  await telefono.reload();
  await expect(telefono.getByRole("alert")).toContainText("El código venció");
  await celular.close();
});
