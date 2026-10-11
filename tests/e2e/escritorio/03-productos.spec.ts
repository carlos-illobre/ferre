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
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
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
  await expect(fila.getByTestId("sin-precio")).toContainText("elegí un margen");

  // Costo con explicación, margen 100 % con el teclado, precio calculado con explicación.
  const explicacion = page.getByTestId("hoja-explicacion");
  await fila.getByTestId("explicacion").first().click();
  await expect(explicacion).toContainText("− 25 % (linea)");
  await explicacion.getByRole("button", { name: "Entendido" }).click();
  await busqueda.press("Shift+Digit3");
  await expect(fila.getByTestId("margen-100")).toHaveAttribute("aria-checked", "true");
  await expect(fila.getByTestId("explicacion").last()).toContainText("$4.000"); // 1500 × 2 × 1,21 = 3630 → para arriba a 4000
  await fila.getByTestId("explicacion").last().click();
  await expect(explicacion).toContainText("+ 100 % de margen");
  await explicacion.getByRole("button", { name: "Entendido" }).click();

  // Queda guardado aunque se recargue con el pedido en vuelo: el cambio se anota en el
  // dispositivo antes de mandarse y se reenvía al arrancar. Acá el servidor "tarda" 5 s.
  await page.route("**/productos/*", async (ruta) => { await new Promise((r) => setTimeout(r, 5000)); await ruta.continue().catch(() => undefined); });
  await fila.getByTestId("margen-50").click();
  await expect(fila.getByTestId("margen-50")).toHaveAttribute("aria-checked", "true");
  await page.waitForTimeout(300); // que llegue a anotarse en el dispositivo
  await page.unroute("**/productos/*");
  await page.reload();
  await page.getByTestId("busqueda").fill("me6");
  const primera = page.getByTestId("producto").first();
  await expect(primera.getByTestId("margen-50")).toHaveAttribute("aria-checked", "true");
  await primera.getByTestId("margen-100").click();
  await expect(primera.getByTestId("explicacion").last()).toContainText("$4.000");
  await page.waitForTimeout(300); // que llegue a anotarse en el dispositivo
  await page.reload();
  await page.getByTestId("busqueda").fill("me6");
  await expect(page.getByTestId("producto").first().getByTestId("margen-100")).toHaveAttribute("aria-checked", "true");

  // Otro margen a mano, en porcentaje: 20 % → 1500 × 1,2 × 1,21 = 2178 → $3.000.
  const fila2 = page.getByTestId("producto").first();
  await fila2.getByTestId("otro-margen").fill("20");
  await fila2.getByTestId("otro-margen").press("Enter");
  await expect(fila2.getByTestId("explicacion").last()).toContainText("$3.000");
  await expect(fila2.getByTestId("margen-100")).toHaveAttribute("aria-checked", "false");

  // El taladro con 25 %: 181.500 → para arriba a $182.000.
  await page.getByTestId("busqueda").fill("e2e taladro");
  const taladro = page.getByTestId("producto").filter({ hasText: "TALADRO PERCUTOR" });
  await expect(taladro).toBeVisible();
  await taladro.getByTestId("margen-25").click();
  await expect(taladro.getByTestId("explicacion").last()).toContainText("$182.000");

  // Nada con palabras que no existen.
  await page.getByTestId("busqueda").fill("zzzz");
  await expect(page.getByTestId("sin-resultados")).toBeVisible();

  // Las flechas eligen la fila y Shift+número su margen, sin sacar las manos del teclado.
  await page.getByTestId("busqueda").fill("e2e tuerca scroll");
  await expect(page.getByTestId("producto")).toHaveCount(30);
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("producto").nth(2)).toHaveAttribute("aria-selected", "true");
  // Estas tuercas no tienen costo: sin costo no se puede elegir margen.
  await expect(page.getByTestId("producto").nth(2).getByTestId("margen-200")).toBeDisabled();

  // Carga progresiva: 30 primero, el resto al llegar al final.
  await page.getByTestId("cargar-mas").scrollIntoViewIfNeeded();
  await expect(page.getByTestId("producto")).toHaveCount(40);
  await expect(page.getByTestId("cargar-mas")).toHaveCount(0);

  // Foto: sin foto muestra el ícono; al tocar se amplía con la descripción y Escape cierra.
  await page.getByTestId("producto").first().getByTestId("foto-chica").click();
  const grande = page.getByTestId("foto-grande");
  await expect(grande).toBeVisible();
  await expect(grande).toContainText("TUERCA SCROLL");
  await expect(grande).toContainText("todavía no tiene foto");
  await page.keyboard.press("Escape");
  await expect(grande).toHaveCount(0);
});
