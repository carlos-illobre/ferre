import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

// Happy path "cargar una lista de precios y aplicarla" (issue #12): el dueño da de alta
// un proveedor, arrastra la muestra anonimizada de Comodo, revisa el resumen, ve la
// explicación de un costo y aplica. Sesión sembrada en la base sin pasar por Google.
const TOKEN = "token-e2e-listas";
const EMAIL = "e2e-listas@ferre.test";
const PROVEEDOR = "Comodo (e2e)";
// El nombre lleva paréntesis: escapado para usarlo en expresiones regulares.
const PROVEEDOR_RE = new RegExp(PROVEEDOR.replace(/[()]/g, "\\$&"));
const MUESTRA = path.resolve("../../microservices/listas-de-proveedores/tests/muestras/LISTA GENERAL PRUEBA 11-8.xlsx");

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`UPDATE lista_importada SET cargada_por = NULL, aplicada_por = NULL WHERE cargada_por IN (SELECT id FROM usuario WHERE email = '${EMAIL}') OR aplicada_por IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Dueño listas E2E', 'dueño')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  // Proveedor de prueba limpio: sin listas ni precios de corridas anteriores.
  psql(`DELETE FROM equivalencia_sugerida WHERE producto_a IN (SELECT id FROM producto WHERE proveedor_preferido_id IN (SELECT id FROM proveedor WHERE nombre = '${PROVEEDOR}')) OR producto_b IN (SELECT id FROM producto WHERE proveedor_preferido_id IN (SELECT id FROM proveedor WHERE nombre = '${PROVEEDOR}'))`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id IN (SELECT id FROM proveedor WHERE nombre = '${PROVEEDOR}')`);
  psql(`DELETE FROM lista_importada WHERE proveedor_id IN (SELECT id FROM proveedor WHERE nombre = '${PROVEEDOR}')`);
  psql(`DELETE FROM producto WHERE proveedor_preferido_id IN (SELECT id FROM proveedor WHERE nombre = '${PROVEEDOR}') AND id NOT IN (SELECT producto_id FROM precio_proveedor)`);
  psql(`DELETE FROM proveedor WHERE nombre = '${PROVEEDOR}'`);
  // Ningún otro proveedor con lector comodo, para que la detección caiga en el de prueba.
  psql(`UPDATE proveedor SET lector = NULL WHERE lector = 'comodo'`);
});

test("cargar una lista de precios y aplicarla", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/");
  await page.getByRole("button", { name: "Catálogo" }).click();
  await page.getByRole("tab", { name: "Listas" }).click();

  // Alta del proveedor con su configuración de costo (descuento por contado 5 %). El panel
  // está arriba de la zona de carga y abierto.
  await page.getByTestId("agregar-proveedor").click();
  await expect(page.getByTestId("panel-proveedores")).toBeVisible();
  await page.getByPlaceholder("Nombre del proveedor").fill(PROVEEDOR);
  await page.locator('select[name="lector"]').selectOption("comodo");
  await page.locator('input[name="contado"]').fill("5");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByTestId("estado-proveedores")).toContainText(PROVEEDOR);

  // Soltar la planilla: se detecta el proveedor y aparece el resumen.
  await page.getByTestId("archivo").setInputFiles(MUESTRA);
  const resumen = page.getByTestId("resumen");
  await expect(resumen).toBeVisible();
  await expect(page.getByRole("heading", { name: PROVEEDOR_RE })).toBeVisible();
  await expect(resumen.getByText("Productos leídos").locator("..")).toContainText("4");
  await expect(resumen.getByText("Nuevos", { exact: true }).locator("..")).toContainText("4");
  await expect(resumen.getByText("Filas salteadas").locator("..")).toContainText("1");

  // La vista previa muestra el costo con descuento de línea y contado, y su explicación.
  const fila = page.getByRole("row", { name: /MP001/ });
  await expect(fila).toContainText("$712,50");
  await fila.getByRole("button").first().click();
  await expect(page.getByTestId("hoja-explicacion")).toContainText("− 25 % (linea)");
  await expect(page.getByTestId("hoja-explicacion")).toContainText("− 5 % (contado)");
  await page.keyboard.press("Escape");

  await page.getByTestId("aplicar").click();
  // Se aplica en segundo plano con barra de progreso; con 4 filas termina enseguida.
  // Al terminar vuelve a la pantalla de listas con el resultado en una tarjeta que se cierra.
  await expect(page.getByTestId("resultado")).toContainText("4 precios actualizados", { timeout: 15000 });
  await expect(page.getByTestId("resultado")).toContainText("4 productos nuevos");
  await page.getByTestId("resultado").getByRole("button", { name: "Cerrar aviso" }).click();
  await expect(page.getByTestId("resultado")).toHaveCount(0);

  // El proveedor ya tiene su última lista aplicada.
  await expect(page.getByTestId("estado-proveedores").getByRole("row", { name: PROVEEDOR_RE })).toContainText("hace");
});
