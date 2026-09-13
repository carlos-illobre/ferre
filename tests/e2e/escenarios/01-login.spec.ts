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
