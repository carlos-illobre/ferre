import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Rol admin: administra como el dueño (usuarios, sesiones, auditoría, proveedores,
// duplicados) pero no puede crear dueños, cambiarlos ni desactivarlos, ni dar ese rol.
const TOKEN = "token-e2e-admin";
const EMAIL_ADMIN = "e2e-admin@ferre.test";
const EMAIL_DUENO = "e2e-admin-dueno@ferre.test";
const EMAIL_NUEVO = "e2e-admin-nuevo@ferre.test";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  for (const e of [EMAIL_ADMIN, EMAIL_DUENO, EMAIL_NUEVO]) {
    psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${e}')`);
    psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${e}')`);
    psql(`DELETE FROM usuario WHERE email = '${e}'`);
  }
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL_ADMIN}', 'Admin E2E', 'admin'), (gen_random_uuid(), '${EMAIL_DUENO}', 'Dueño protegido E2E', 'dueño')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL_ADMIN}'`);
});

test("el admin administra pero no toca dueños", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/administracion");
  await expect(page.getByTestId("usuario")).toContainText("Admin E2E · admin");
  await expect(page.getByText("Quién puede entrar")).toBeVisible();
  await expect(page.getByText("Sesiones abiertas")).toBeVisible();

  // Autorizar un mostrador: sí. El selector de alta no ofrece "dueño".
  await page.getByTestId("autorizar").click();
  const alta = page.getByTestId("alta-usuario");
  await expect(alta.locator('select[name="rol"] option', { hasText: "dueño" })).toHaveCount(0);
  await alta.getByPlaceholder("Nombre").fill("Nuevo mostrador");
  await alta.getByPlaceholder("correo@gmail.com").fill(EMAIL_NUEVO);
  await alta.getByRole("button", { name: "Autorizar" }).click();
  await expect(page.getByTestId("usuarios")).toContainText(EMAIL_NUEVO);

  // La fila del dueño no se puede tocar desde acá.
  const filaDueno = page.getByTestId("usuario-fila").filter({ hasText: "Dueño protegido E2E" });
  await expect(filaDueno.locator("select")).toBeDisabled();
  await expect(filaDueno).toContainText("solo el dueño");

  // Y la API lo rechaza aunque se intente directo.
  const respuestas = await page.evaluate(async ([token, email]) => {
    const cabeceras = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const crear = await fetch("http://localhost/usuarios", { method: "POST", headers: cabeceras, body: JSON.stringify({ email: "e2e-otro-dueno@ferre.test", nombre: "X", rol: "dueño" }) });
    const lista = (await (await fetch("http://localhost/usuarios", { headers: cabeceras })).json()) as { id: string; email: string }[];
    const dueno = lista.find((u) => u.email === email)!;
    const desactivar = await fetch(`http://localhost/usuarios/${dueno.id}`, { method: "PATCH", headers: cabeceras, body: JSON.stringify({ activo: false }) });
    const ascender = await fetch(`http://localhost/usuarios/${lista.find((u) => u.email === "e2e-admin-nuevo@ferre.test")!.id}`, { method: "PATCH", headers: cabeceras, body: JSON.stringify({ rol: "dueño" }) });
    return [crear.status, desactivar.status, ascender.status];
  }, [TOKEN, EMAIL_DUENO] as const);
  expect(respuestas).toEqual([403, 403, 403]);
  expect(psql(`SELECT activo::text FROM usuario WHERE email = '${EMAIL_DUENO}'`)).toBe("true");
  expect(psql(`SELECT count(*) FROM usuario WHERE email = 'e2e-otro-dueno@ferre.test'`)).toBe("0");
});
