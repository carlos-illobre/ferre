import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { psqlAcceso } = stack("escritorio");

// Cerrar la sesión de otro dispositivo desde la tarjeta de la persona, en Usuarios (decisión 100);
// la propia se cierra con "Salir", que vuelve al login.
const TOKEN = "token-e2e-cerrar-propia";
const TOKEN_OTRA = "token-e2e-cerrar-otra";
const EMAIL = "e2e-cerrar-sesion@ferre.test";

test.beforeEach(() => {
  psqlAcceso(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psqlAcceso(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psqlAcceso(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Dueño cerrar E2E', 'dueño')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psqlAcceso(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  for (const [t, d] of [[TOKEN, "esta computadora"], [TOKEN_OTRA, "otro celular"]]) {
    const hash = createHash("sha256").update(t!).digest("hex");
    psqlAcceso(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', '${d}', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  }
});

test("007-T037 en la tarjeta de la persona se cierra la sesión de otro dispositivo; la de este no figura", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await page.goto("/#/usuarios");
  // Como la v2 (021): la persona se elige en la lista y su ficha, al lado, tiene su acceso.
  const fila = page.getByTestId("usuario-fila").filter({ hasText: "Dueño cerrar E2E" });
  await expect(fila.getByLabel(/1 sesión/)).toBeVisible();
  await fila.click();
  await expect(page.getByTestId("lista-de-acceso")).toContainText("Sesiones abiertas (1)");
  await expect(page.getByTestId("sesion").filter({ hasText: "otro celular" })).toBeVisible();
  // La de este dispositivo se cierra con «Salir»: no se repite en la lista (decisión 99).
  await expect(page.getByTestId("sesion").filter({ hasText: "esta computadora" })).toHaveCount(0);
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Cerrar la sesión de Dueño cerrar E2E en otro celular" }).click();
  await expect.poll(() => psqlAcceso(`SELECT count(*) FROM sesion WHERE dispositivo = 'otro celular' AND revocada_en IS NOT NULL`)).toBe("1");
  await expect(page.getByTestId("sesion").filter({ hasText: "otro celular" })).toHaveCount(0);
  await expect.poll(() => psqlAcceso(`SELECT count(*) FROM sesion WHERE dispositivo = 'esta computadora' AND revocada_en IS NULL`)).toBe("1");
});

test("Salir vuelve al login", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await page.goto("/#/vender");
  // «Cerrar sesión» está en el menú del usuario, abajo del menú (decisión 126).
  await page.getByTestId("cuenta").click();
  await page.getByTestId("salir").click();
  await expect(page.getByRole("heading", { name: "Entrá con tu celular" })).toBeVisible();
  await expect.poll(() => psqlAcceso(`SELECT count(*) FROM sesion WHERE dispositivo = 'esta computadora' AND revocada_en IS NOT NULL`)).toBe("1");
});
