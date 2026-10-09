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
  // Las tuercas del escenario apuntan al proveedor: van antes que él.
  psql(`DELETE FROM precio_proveedor WHERE producto_id IN (SELECT id FROM producto WHERE descripcion LIKE 'TUERCA SCROLL % (E2E)')`);
  psql(`DELETE FROM producto WHERE descripcion LIKE 'TUERCA SCROLL % (E2E)'`);
  psql(`DELETE FROM proveedor WHERE nombre = '${PROVEEDOR}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('00000000-0000-0000-0000-00000000e2e1', '${PROVEEDOR}')`);
  psql(`INSERT INTO producto (id, descripcion, marca, codigo_barras) VALUES ('00000000-0000-0000-0000-00000000e2e2', 'MECHA PARA MADERA DE 6 MM (E2E)', 'MARCA E2E', '7790000000099'), ('00000000-0000-0000-0000-00000000e2e3', 'TALADRO PERCUTOR 750 W (E2E)', 'MARCA E2E', NULL)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-00000000e2e2', '00000000-0000-0000-0000-00000000e2e1', 'ME6', 2000, '{"explicacion": ["Precio de lista 2000", "− 25 % (linea) = 1500", "Costo neto 1500"]}', 1500, 0.21, '2026-08-11'), (gen_random_uuid(), '00000000-0000-0000-0000-00000000e2e3', '00000000-0000-0000-0000-00000000e2e1', 'TP750', 120000, '[]', 120000, 0.21, '2026-08-11')`);
  psql(`INSERT INTO producto (id, descripcion, marca, proveedor_preferido_id) SELECT gen_random_uuid(), 'TUERCA SCROLL ' || n || ' (E2E)', 'MARCA E2E', '00000000-0000-0000-0000-00000000e2e1' FROM generate_series(1, 40) n`);
});

test("buscar un producto, elegir el margen y tipear otro margen a mano", async ({ page }) => {
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
  await expect(fila).toContainText("sin margen");

  // La ficha se abre con Enter. Ahí, costo con explicación, margen 100 %, precio calculado.
  await busqueda.press("Enter");
  const ficha = page.getByTestId("ficha-producto");
  await expect(ficha).toContainText("MECHA PARA MADERA DE 6 MM (E2E)");
  await ficha.getByRole("button", { name: /Cómo se calcula el costo/ }).click();
  await expect(page.getByTestId("hoja-explicacion")).toContainText("− 25 % (linea)");
  await page.keyboard.press("Escape");
  await ficha.getByRole("button", { name: "100 %" }).click();
  await expect(ficha.getByRole("button", { name: "100 %" })).toHaveClass(/activo/);
  await expect(ficha).toContainText("$4.000"); // 1500 × 2 × 1,21 = 3630 → para arriba a 4000
  await ficha.getByRole("button", { name: "De dónde sale $4.000" }).click();
  await expect(page.getByTestId("hoja-explicacion")).toContainText("+ 100 % de margen");
  await page.keyboard.press("Escape");

  // Queda guardado aunque se recargue con el pedido en vuelo: el cambio se anota en el
  // dispositivo antes de mandarse y se reenvía al arrancar. Acá el servidor "tarda" 5 s.
  await page.route("**/productos/*", async (ruta) => { await new Promise((r) => setTimeout(r, 5000)); await ruta.continue().catch(() => undefined); });
  await ficha.getByRole("button", { name: "50 %" }).click();
  await expect(ficha.getByRole("button", { name: "50 %" })).toHaveClass(/activo/);
  await page.waitForTimeout(300); // que llegue a anotarse en el dispositivo
  await page.unroute("**/productos/*");
  await page.reload();
  await page.getByTestId("busqueda").fill("me6");
  await expect(page.getByTestId("producto").first()).toContainText("50 %");
  await page.getByTestId("producto").first().click();
  await page.getByTestId("ficha-producto").getByRole("button", { name: "100 %" }).click();
  await expect(page.getByTestId("ficha-producto")).toContainText("$4.000");
  await page.waitForTimeout(300); // que llegue a anotarse en el dispositivo
  await page.reload();
  await page.getByTestId("busqueda").fill("me6");
  await expect(page.getByTestId("producto").first()).toContainText("100 %");

  // Otro margen a mano, en porcentaje: 20 % → 1500 × 1,2 × 1,21 = 2178 → $3.000.
  await page.getByTestId("producto").first().click();
  const ficha2 = page.getByTestId("ficha-producto");
  await ficha2.getByTestId("otro-margen").fill("20");
  await ficha2.getByTestId("otro-margen").press("Enter");
  await expect(ficha2).toContainText("$3.000");
  await expect(ficha2).toContainText("20 % a mano");
  await expect(ficha2.getByRole("button", { name: "100 %" })).not.toHaveClass(/activo/);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("producto").first()).toContainText("20 % a mano");

  // El taladro con 25 %: 181.500 → para arriba a $182.000. Con Shift+5 desde la lista.
  await page.getByTestId("busqueda").fill("e2e taladro");
  const taladro = page.getByTestId("producto").filter({ hasText: "TALADRO PERCUTOR" });
  await expect(taladro).toBeVisible();
  await page.keyboard.press("Shift+Digit5");
  await expect(taladro).toContainText("$182.000");

  // Nada con palabras que no existen.
  await page.getByTestId("busqueda").fill("zzzz");
  await expect(page.getByTestId("sin-resultados")).toBeVisible();

  // Las flechas y Shift+número funcionan aunque la búsqueda no tenga el foco.
  await page.getByTestId("busqueda").fill("e2e tuerca scroll");
  await expect(page.getByTestId("producto")).toHaveCount(30);
  await page.locator("h1").first().click(); // el foco sale de la caja
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("producto").nth(2)).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Shift+Digit2");
  await expect(page.getByTestId("producto").nth(2)).toContainText("200 %");

  // Carga progresiva: 30 primero, el resto al llegar al final.
  await page.getByTestId("cargar-mas").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("producto")).toHaveCount(40);
  await expect(page.getByTestId("cargar-mas")).toHaveCount(0);

  // Foto: en la ficha, sin foto muestra el ícono; al tocar se amplía con la descripción y Escape cierra.
  await page.getByTestId("producto").first().click();
  await page.getByTestId("ficha-producto").getByTestId("foto-chica").click();
  const grande = page.getByTestId("foto-grande");
  await expect(grande).toBeVisible();
  await expect(grande).toContainText("TUERCA SCROLL");
  await expect(grande).toContainText("todavía no tiene foto");
  await page.keyboard.press("Escape");
  await expect(grande).toHaveCount(0);
});
