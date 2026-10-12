import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Sin sesión se ve el login; con una sesión válida en el dispositivo, la app entra
// directo y el dueño ve la administración. La sesión se siembra en la base sin pasar
// por Google (que no se puede automatizar).
const TOKEN = "token-e2e-dueno";
const EMAIL = "e2e-dueno@ferre.test";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  // Si una corrida anterior se cortó puede haber quedado una huella vinculada.
  psql(`DELETE FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM vinculacion`);
  // El emparejamiento que deja la entrada con el celular, y la foto que se manda con él.
  psql(`DELETE FROM codigo_escaneado WHERE puesto_id IN (SELECT id FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')))`);
  psql(`DELETE FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')) OR celular_sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}'))`);
  psql(`DELETE FROM foto_comprobante WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Dueño E2E', 'dueño')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
});

test("sin sesión se pide entrar", async ({ page }) => {
  await page.goto("/");
  // En la computadora se entra con el celular (RF-76): el código está sin pedirlo.
  await expect(page.getByRole("heading", { name: "Entrá con tu celular" })).toBeVisible();
  await expect(page.getByTestId("qr-entrar")).toBeVisible();
  await expect(page.getByText(/No hay contraseñas/)).toBeVisible();
});

test("con sesión el dueño entra y ve la administración", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/");
  await expect(page.getByTestId("usuario")).toContainText("Dueño E2E");
  // Lo que se usa poco está en «Más» (decisión 28).
  await page.getByTestId("menu-mas").click();
  await page.getByTestId("mas-usuarios").click();
  await expect(page.getByTestId("usuarios")).toContainText(EMAIL);
});

// Passkeys con un autenticador virtual de Chromium (huella simulada): vincular el
// dispositivo desde Administración, salir, y volver a entrar con la huella sin Google.
test("vincular el celular con la huella y volver a entrar con ella", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  psql(`DELETE FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);

  // En la computadora la app no ofrece la huella aunque se acabe de entrar con Google
  // (eso es del celular): se vincula a mano desde Administración.
  await page.addInitScript((token) => { localStorage.setItem("ferre.sesion", token); sessionStorage.setItem("ferre.recien-google", "1"); }, TOKEN);
  await page.goto("/#/usuarios");
  await expect(page.getByTestId("usuario")).toContainText("Dueño E2E");
  await expect(page.getByTestId("ofrecer-huella")).toHaveCount(0);
  await expect(page.getByTestId("celular")).toHaveCount(0);
  await page.getByTestId("vincular-celular").click();
  await page.getByTestId("nombre-celular").fill("Celular E2E");
  await page.getByTestId("confirmar-vincular").click();
  await expect(page.getByTestId("mensaje-celular")).toContainText("«Celular E2E» entra con la huella");
  await expect(page.getByTestId("celular")).toContainText("Celular E2E");
  expect(psql(`SELECT count(*) FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}') AND revocada_en IS NULL`)).toBe("1");

  // Salir y entrar con la huella: sin Google.
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByTestId("entrar-huella")).toBeVisible();
  await page.getByTestId("entrar-huella").click();
  await expect(page.getByTestId("usuario")).toContainText("Dueño E2E");
  expect(psql(`SELECT contenido->>'medio' FROM evento WHERE tipo = 'sesion.iniciada' AND usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}') ORDER BY fecha DESC LIMIT 1`)).toBe("huella");

  // Quitar el celular: ya no entra con la huella.
  await page.goto("/#/usuarios");
  await page.getByTestId("celular").getByRole("button", { name: /Quitar/ }).click();
  await expect(page.getByTestId("celular")).toHaveCount(0);
  await page.getByRole("button", { name: "Salir" }).click();
  await page.getByTestId("entrar-huella").click();
  await expect(page.getByTestId("error-huella")).toContainText("no está vinculado");
});

// Entrar a la computadora con el celular (RF-76, decisión 57): la entrada de la computadora
// muestra sola un código; el celular lo lee y la computadora entra, sin paso de confirmar.
test("entrar a la computadora leyendo su código con el celular", async ({ browser }) => {
  // Una sesión propia para el celular: las otras pruebas de este archivo cierran la suya.
  const TOKEN_CELULAR = "token-e2e-login-celular";
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${createHash("sha256").update(TOKEN_CELULAR).digest("hex")}', 'e2e celular', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  const compu = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  await compu.goto("/");
  await expect(compu.getByRole("heading", { name: "Entrá con tu celular" })).toBeVisible();
  await expect(compu.getByTestId("qr-entrar").locator("img")).toBeVisible();
  // Sin una huella vinculada en esta computadora, no se ofrece entrar con la huella.
  await expect(compu.getByTestId("entrar-huella")).toHaveCount(0);
  const enlace = await compu.evaluate(() => (window as unknown as { __enlaceParaEntrar: string }).__enlaceParaEntrar);
  expect(enlace).toContain("#/entrar-compu?codigo=");
  const ruta = enlace.replace(/^https?:\/\/[^/]+/, "");

  // Un celular sin sesión ve la entrada de siempre, que avisa que la computadora entra también.
  const sinSesion = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await sinSesion.goto(ruta);
  await expect(sinSesion.getByTestId("entrar-para-la-compu")).toContainText("esa computadora entra también");
  await expect(compu.getByTestId("qr-entrar")).toBeVisible(); // nadie entró todavía

  // Un celular que ya tenía la sesión: un toque, y la computadora entra sola con ese usuario.
  const celular = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await celular.addInitScript((t) => localStorage.setItem("ferre.sesion", t), TOKEN_CELULAR);
  await celular.goto(ruta);
  await celular.getByTestId("dejar-entrar").click();
  await expect(celular.getByTestId("compu-entro")).toBeVisible();
  await expect(compu.getByTestId("usuario")).toContainText("Dueño E2E", { timeout: 10000 });
  expect(psql(`SELECT count(*) FROM evento WHERE tipo = 'sesion.iniciada' AND contenido->>'medio' = 'celular' AND usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL}')`)).toBe("1");

  // Quedan emparejados (decisión 58): sin leer más códigos, la computadora ya tiene su celular…
  await expect(celular.getByTestId("quedo-emparejado")).toBeVisible({ timeout: 15000 });
  expect(psql(`SELECT count(*) FROM puesto WHERE vinculado_en IS NOT NULL AND expira_en > now() + interval '29 days' AND celular_sesion_id = (SELECT id FROM sesion WHERE token_hash = '${createHash("sha256").update(TOKEN_CELULAR).digest("hex")}')`)).toBe("1");
  await compu.goto("/#/vender");
  await expect(compu.getByTestId("celular-vinculado")).toBeVisible();
  // La computadora le pide que haga de lector (decisión 59): al celular le aparece el aviso,
  // abre el lector y lo que lee llega a la venta de la computadora. (Sin cámara en la prueba: se tipea.)
  await compu.getByTestId("pedir-lector").click();
  await expect(compu.getByTestId("lector-pedido")).toBeVisible();
  await celular.getByTestId("seguir-en-el-celular").click();
  await celular.getByTestId("abrir-el-lector").click();
  await celular.getByTestId("codigo-manual").fill("7790000000011");
  await celular.getByRole("button", { name: "Enviar" }).click();
  await expect(celular.getByTestId("escaner-ultimo")).toContainText("ya está en la computadora");
  await expect(compu.getByTestId("codigo-desconocido")).toContainText("7790000000011", { timeout: 10000 });
  await celular.getByRole("button", { name: "Cerrar" }).click();
  // …y la foto de una factura se la pide sin código: al celular le aparece el aviso.
  await compu.goto("/#/compras");
  await compu.getByTestId("foto-con-celular").click();
  await expect(compu.getByTestId("pedida-al-celular")).toBeVisible();
  await expect(celular.getByTestId("pedido-de-la-compu")).toContainText("La computadora pide una foto");
  await celular.getByTestId("sacar-foto-para-la-compu").click();
  await celular.getByTestId("archivo-para-la-compu").setInputFiles({ name: "factura.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
  await expect(compu.getByTestId("foto-comprobante")).toContainText("cargada", { timeout: 15000 });

  // El código sirve una sola vez.
  const otro = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await otro.addInitScript((t) => localStorage.setItem("ferre.sesion", t), TOKEN_CELULAR);
  await otro.goto(ruta);
  await otro.getByTestId("dejar-entrar").click();
  await expect(otro.getByTestId("compu-no-entro")).toContainText("Leé el que la computadora muestra ahora");
});
