import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";
import { cerrarLasOtrasVentanas, otraVentana } from "../comun/ventanas";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { psql } = stack("escritorio");

// La computadora no tiene cámara: en el ingreso le pide la foto de la factura a su celular
// emparejado, que la saca y la manda por la conexión entre los dos; la foto aparece sola en la
// computadora (decisión 152, specs/023). Sin celular emparejado, no hay código QR.
const TOKEN = "token-e2e-foto-qr";
const TOKEN_CELULAR = "token-e2e-foto-qr-celular";
const TOKEN_SOLA = "token-e2e-foto-qr-sola";
const EMAIL = "e2e-foto-qr@ferre.test";
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

test.beforeAll(() => {
  const delUsuario = `(SELECT id FROM usuario WHERE email = '${EMAIL}')`;
  const susSesiones = `(SELECT id FROM sesion WHERE usuario_id IN ${delUsuario})`;
  psql(`DELETE FROM foto_comprobante WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM codigo_escaneado WHERE puesto_id IN (SELECT id FROM puesto WHERE sesion_id IN ${susSesiones} OR celular_sesion_id IN ${susSesiones})`);
  psql(`DELETE FROM puesto WHERE sesion_id IN ${susSesiones} OR celular_sesion_id IN ${susSesiones}`);
  psql(`DELETE FROM sesion WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM evento WHERE usuario_id IN ${delUsuario}`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Foto QR E2E', 'mostrador')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  for (const t of [TOKEN, TOKEN_CELULAR, TOKEN_SOLA]) {
    psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash(t)}', 'e2e ${t}', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  }
  // La computadora y el celular, ya emparejados. La tercera sesión es otra computadora, sin celular.
  psql(`INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, vinculado_en, celular_sesion_id, expira_en) SELECT gen_random_uuid(), a.id, 'e2e-foto', 'computadora e2e', now(), b.id, now() + interval '30 days' FROM sesion a, sesion b WHERE a.token_hash = '${hash(TOKEN)}' AND b.token_hash = '${hash(TOKEN_CELULAR)}'`);
});

test.afterEach(cerrarLasOtrasVentanas);

test("023-E17: la computadora le pide la foto de la factura al celular emparejado y la recibe sola", async ({ page, browser }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/ingreso");
  const telefono = await otraVentana(browser, { viewport: { width: 412, height: 915 }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36" });
  await telefono.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN_CELULAR);
  await telefono.goto("/#/vender");
  await expect(page.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "directa", { timeout: 15000 });

  await page.getByTestId("foto-con-celular").click();
  await expect(page.getByTestId("pedida-al-celular")).toBeVisible();
  await expect(page.getByTestId("pedido-de-foto").getByRole("img")).toHaveCount(0);

  // En el celular aparece el pedido, sin leer ningún código: saca la foto y la manda.
  await expect(telefono.getByTestId("pedido-de-la-compu")).toContainText("la foto de la factura", { timeout: 10000 });
  await telefono.getByTestId("sacar-foto-para-la-compu").click();
  await telefono.getByTestId("archivo-para-la-compu").setInputFiles({ name: "factura.png", mimeType: "image/png", buffer: FOTO });
  await expect(telefono.getByRole("status")).toContainText("ya está en la computadora", { timeout: 10000 });

  // En la computadora la foto aparece sola y queda lista para leerla.
  await expect(page.getByTestId("foto-comprobante")).toContainText("Foto de la factura cargada", { timeout: 15000 });
  await page.getByTestId("foto-comprobante").getByTestId("ver-comprobante").click();
  await expect(page.getByRole("dialog", { name: "Foto de la factura" })).toBeVisible();
  await expect.poll(() => psql(`SELECT count(*) FROM foto_comprobante WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`)).toBe("1");
});

test("023-E24: sin celular emparejado no hay código QR: se elige un archivo o se vincula el celular", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN_SOLA);
  await page.goto("/#/ingreso");
  await page.getByTestId("foto-con-celular").click();
  await expect(page.getByTestId("foto-sin-celular")).toContainText("Vincular el celular");
  await expect(page.getByTestId("pedido-de-foto").getByRole("img")).toHaveCount(0);
});
