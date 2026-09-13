import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Happy path "ver el stock valorizado" (issue #33): con una compra y una venta cargadas,
// la pantalla muestra el stock como suma de movimientos, el valor como stock × costo, la
// valorización total, y permite corregir con "hay tantas" dejando el ajuste explicado.
const TOKEN = "token-e2e-stock";
const EMAIL = "e2e-stock@ferre.test";
const ID_PROV = "00000000-0000-0000-0000-00000000e2ea";
const ID_PROD = "00000000-0000-0000-0000-00000000e2eb";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador stock E2E', 'mostrador')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  psql(`DELETE FROM movimiento_stock WHERE producto_id = '${ID_PROD}'`);
  psql(`DELETE FROM precio_proveedor WHERE producto_id = '${ID_PROD}'`);
  psql(`DELETE FROM producto WHERE id = '${ID_PROD}'`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', 'Proveedor stock (e2e)')`);
  psql(`INSERT INTO producto (id, descripcion, marca, proveedor_preferido_id) VALUES ('${ID_PROD}', 'CANDADO STOCK 40 MM (E2E)', 'MARCA E2E', '${ID_PROV}')`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_PROD}', '${ID_PROV}', 'CS40', 2500, '[]', 2500, 0.21, '2026-08-01')`);
  // Movimientos: entraron 20, se vendieron 3.
  psql(`INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, fecha) VALUES (gen_random_uuid(), '${ID_PROD}', 'compra', 20, 'compra', '2026-09-01'), (gen_random_uuid(), '${ID_PROD}', 'venta', -3, 'venta', '2026-09-05')`);
});

test("ver el stock, su valor, sus movimientos y corregirlo", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/stock");
  await expect(page.getByRole("heading", { name: "Stock" })).toBeVisible();
  await expect(page.getByTestId("valorizacion")).toContainText("Valor del inventario");

  await page.getByTestId("busqueda").fill("e2e candado stock");
  const fila = page.getByTestId("fila-stock").filter({ hasText: "CANDADO STOCK 40 MM" });
  await expect(fila.getByTestId("stock")).toContainText("17");
  await expect(fila).toContainText("$42.500,00"); // 17 × 2500

  // La explicación del número: sus movimientos.
  await fila.getByTestId("stock").click();
  const movimientos = page.getByTestId("movimientos");
  await expect(movimientos).toContainText("Compra");
  await expect(movimientos).toContainText("+20");
  await expect(movimientos).toContainText("-3");
  await expect(page.getByText("Stock 17 = suma de estos movimientos")).toBeVisible();

  // Corregir: "hay 15", con motivo. Queda un ajuste de −2 explicado.
  await fila.getByRole("button", { name: "Corregir" }).click();
  await page.getByTestId("cantidad-real").fill("15");
  await page.getByPlaceholder(/Motivo/).fill("conté la góndola");
  await page.getByTestId("guardar-ajuste").click();
  await expect(fila.getByTestId("stock")).toContainText("15");
  await expect(fila).toContainText("$37.500,00");
  await expect(movimientos).toContainText("Conteo");
  await expect(movimientos).toContainText("había 17, hay 15: conté la góndola");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_PROD}'`)).toBe("15.000");

  // En la venta se ve el stock del producto.
  await page.goto("/#/vender");
  await page.getByTestId("busqueda").fill("e2e candado stock");
  await expect(page.getByTestId("sugerencias")).toContainText("stock 15");
});
