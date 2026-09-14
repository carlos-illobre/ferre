import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Cerrar sesiones desde Administración: cerrar la de otro dispositivo la saca de la lista;
// cerrar la propia vuelve al login. Y "Salir" también vuelve al login.
const TOKEN = "token-e2e-cerrar-propia";
const TOKEN_OTRA = "token-e2e-cerrar-otra";
const EMAIL = "e2e-cerrar-sesion@ferre.test";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeEach(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Dueño cerrar E2E', 'dueño')`);
  for (const [t, d] of [[TOKEN, "esta computadora"], [TOKEN_OTRA, "otro celular"]]) {
    const hash = createHash("sha256").update(t!).digest("hex");
    psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', '${d}', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  }
});

test("cerrar la sesión de otro dispositivo la saca de la lista", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/administracion");
  const otra = page.getByRole("row", { name: /otro celular/ });
  await expect(otra).toBeVisible();
  await otra.getByRole("button", { name: "Cerrar" }).click();
  await expect(page.getByRole("row", { name: /otro celular/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /esta computadora/ })).toBeVisible();
  expect(psql(`SELECT count(*) FROM sesion WHERE dispositivo = 'otro celular' AND revocada_en IS NOT NULL`)).toBe("1");
});

test("cerrar la sesión propia desde Administración vuelve al login", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/administracion");
  const propia = page.getByRole("row", { name: /esta computadora/ });
  await expect(propia).toBeVisible();
  await expect(propia).toContainText("esta sesión");
  await propia.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByText("Entrá con tu cuenta de Google.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("ferre.sesion"))).toBeNull();
  // Recargar no vuelve a entrar.
  await page.reload();
  await expect(page.getByText("Entrá con tu cuenta de Google.")).toBeVisible();
});

test("Salir vuelve al login", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/vender");
  await page.getByRole("button", { name: "Salir" }).click();
  await expect(page.getByText("Entrá con tu cuenta de Google.")).toBeVisible();
  expect(psql(`SELECT count(*) FROM sesion WHERE dispositivo = 'esta computadora' AND revocada_en IS NOT NULL`)).toBe("1");
});
