import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Happy path "buscar un producto y elegir su margen" (issues #13 y #14): con un catálogo
// sembrado, el empleado escribe dos palabras en cualquier orden, encuentra el producto,
// elige 100 % con el teclado y ve el precio con su explicación; después fija un precio a
// mano y ve el margen real. Sesión sembrada sin pasar por Google.
const TOKEN = "token-e2e-productos";
const EMAIL = "e2e-productos@ferre.test";
const PROVEEDOR = "Proveedor productos (e2e)";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador E2E', 'mostrador')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  // Catálogo mínimo: un proveedor con dos productos y su costo vigente. Sin '$' en los
  // textos: el SQL pasa por un shell con comillas dobles y $2 se expandiría. Las comillas
  // dobles del JSON van sin escapar: psql() las escapa una sola vez.
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id IN (SELECT id FROM proveedor WHERE nombre = '${PROVEEDOR}')`);
  // Solo los productos de este escenario: otros escenarios tienen los suyos, con ventas colgando.
  psql(`DELETE FROM movimiento_stock WHERE producto_id IN ('00000000-0000-0000-0000-00000000e2e2', '00000000-0000-0000-0000-00000000e2e3')`);
  psql(`DELETE FROM item_venta WHERE producto_id IN ('00000000-0000-0000-0000-00000000e2e2', '00000000-0000-0000-0000-00000000e2e3')`);
  psql(`DELETE FROM consulta WHERE producto_id IN ('00000000-0000-0000-0000-00000000e2e2', '00000000-0000-0000-0000-00000000e2e3')`);
  psql(`DELETE FROM producto WHERE id IN ('00000000-0000-0000-0000-00000000e2e2', '00000000-0000-0000-0000-00000000e2e3')`);
  psql(`DELETE FROM proveedor WHERE nombre = '${PROVEEDOR}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('00000000-0000-0000-0000-00000000e2e1', '${PROVEEDOR}')`);
  psql(`INSERT INTO producto (id, descripcion, marca, codigo_barras) VALUES ('00000000-0000-0000-0000-00000000e2e2', 'MECHA PARA MADERA DE 6 MM (E2E)', 'MARCA E2E', '7790000000099'), ('00000000-0000-0000-0000-00000000e2e3', 'TALADRO PERCUTOR 750 W (E2E)', 'MARCA E2E', NULL)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-00000000e2e2', '00000000-0000-0000-0000-00000000e2e1', 'ME6', 2000, '{"explicacion": ["Precio de lista 2000", "− 25 % (linea) = 1500", "Costo neto 1500"]}', 1500, 0.21, '2026-08-11'), (gen_random_uuid(), '00000000-0000-0000-0000-00000000e2e3', '00000000-0000-0000-0000-00000000e2e1', 'TP750', 120000, '[]', 120000, 0.21, '2026-08-11')`);
});

test("buscar un producto, elegir el margen y fijar un precio a mano", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/productos");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  await expect(busqueda).toBeFocused();

  // Dos palabras en cualquier orden, sin importar mayúsculas. "e2e" acota a los productos
  // sembrados: la base del compose puede tener listas reales cargadas por otras pruebas.
  await busqueda.fill("e2e madera mecha");
  const fila = page.getByTestId("producto").filter({ hasText: "MECHA PARA MADERA DE 6 MM (E2E)" });
  await expect(fila).toBeVisible();
  await expect(page.getByTestId("producto")).toHaveCount(1);
  await expect(fila).toContainText("sin precio");

  // Costo con explicación, margen 100 % con el teclado, precio calculado con explicación.
  await fila.locator("summary").first().click();
  await expect(fila).toContainText("− 25 % (linea)");
  await busqueda.press("Shift+3");
  await expect(fila.getByRole("button", { name: "100 %" })).toHaveClass(/activo/);
  await expect(fila.locator("td.precio")).toContainText("$3.630,00"); // 1500 × 2 × 1,21 = 3630
  await fila.locator("td.precio summary").click();
  await expect(fila).toContainText("+ 100 % de margen");

  // Queda guardado: al recargar, el margen sigue.
  await page.reload();
  await page.getByTestId("busqueda").fill("me6");
  await expect(page.getByTestId("producto").first().getByRole("button", { name: "100 %" })).toHaveClass(/activo/);

  // Precio a mano: muestra el margen real que deja.
  const fila2 = page.getByTestId("producto").first();
  await fila2.getByRole("button", { name: "a mano" }).click();
  await fila2.locator("input.precio-manual").fill("4235");
  await fila2.locator("input.precio-manual").press("Enter");
  await expect(fila2.locator("td.precio")).toContainText("$4.235,00");
  await expect(fila2.locator("td.precio")).toContainText("a mano · 133.3 %"); // 4235 / 1,21 = 3500 → 133,3 % sobre 1500

  // El taladro caro con 25 % redondea a $100.
  await page.getByTestId("busqueda").fill("e2e taladro");
  const taladro = page.getByTestId("producto").first();
  await taladro.getByRole("button", { name: "25 %" }).click();
  await expect(taladro.locator("td.precio")).toContainText("$181.500,00");

  // Nada con palabras que no existen.
  await page.getByTestId("busqueda").fill("zzzz");
  await expect(page.getByTestId("sin-resultados")).toBeVisible();
});
