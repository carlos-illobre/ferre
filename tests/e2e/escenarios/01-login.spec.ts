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
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Dueño E2E', 'dueño')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
});

test("sin sesión se pide entrar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Entrá con tu cuenta de Google.")).toBeVisible();
  await expect(page.getByRole("button", { name: /leer con el celular/ })).toBeVisible();
});

test("con sesión el dueño entra y ve la administración", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/");
  await expect(page.getByTestId("usuario")).toContainText("Dueño E2E · dueño");
  await page.getByRole("button", { name: "Administración" }).click();
  await expect(page.getByRole("heading", { name: "Usuarios autorizados" })).toBeVisible();
  await expect(page.getByRole("cell", { name: EMAIL })).toBeVisible();
});

// Passkeys con un autenticador virtual de Chromium (huella simulada): vincular el
// dispositivo desde Administración, salir, y volver a entrar con la huella sin Google.
test("vincular el celular con la huella y volver a entrar con ella", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  psql(`DELETE FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);

  // Recién entrado con Google (Google no se automatiza: se siembra la sesión y la marca),
  // la app ofrece usar la huella, como en el banco. Aceptar vincula el celular.
  await page.addInitScript((token) => { localStorage.setItem("ferre.sesion", token); sessionStorage.setItem("ferre.recien-google", "1"); }, TOKEN);
  await page.goto("/#/administracion");
  await expect(page.getByTestId("ofrecer-huella")).toContainText("¿Entrar con la huella?");
  await page.getByTestId("aceptar-huella").click();
  await expect(page.getByTestId("ofrecer-huella")).toContainText("Listo");
  await page.getByRole("button", { name: "Entendido" }).click();
  await expect(page.getByTestId("celular")).toHaveCount(1);
  // No vuelve a ofrecerlo; y desde Administración se puede quitar y vincular a mano.
  await page.reload();
  await expect(page.getByTestId("ofrecer-huella")).toHaveCount(0);
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("celular").getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByTestId("celular")).toHaveCount(0);
  // El autenticador virtual elige solo la primera clave que tiene (un celular real muestra
  // para elegir): se borra la quitada para que la prueba use la nueva.
  await cdp.send("WebAuthn.clearCredentials", { authenticatorId });
  page.once("dialog", (d) => d.accept("Celular E2E"));
  await page.getByTestId("vincular-celular").click();
  await expect(page.getByTestId("mensaje-celular")).toContainText('"Celular E2E" entra con la huella');
  await expect(page.getByTestId("celular")).toContainText("Celular E2E");
  expect(psql(`SELECT count(*) FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}') AND revocada_en IS NULL`)).toBe("1");

  // Salir y entrar con la huella: sin Google.
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByTestId("entrar-huella")).toBeVisible();
  await page.getByTestId("entrar-huella").click();
  await expect(page.getByTestId("usuario")).toContainText("Dueño E2E · dueño");
  expect(psql(`SELECT contenido->>'medio' FROM evento WHERE tipo = 'sesion.iniciada' AND usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}') ORDER BY fecha DESC LIMIT 1`)).toBe("huella");

  // Quitar el celular: ya no entra con la huella.
  await page.goto("/#/administracion");
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("celular").getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByTestId("celular")).toHaveCount(0);
  await page.getByRole("button", { name: "Salir" }).click();
  await page.getByTestId("entrar-huella").click();
  await expect(page.getByTestId("error-huella")).toContainText("no está vinculado");
});
