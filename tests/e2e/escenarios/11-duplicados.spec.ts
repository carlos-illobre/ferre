import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Un mismo artículo en dos proveedores (issue #29): dos productos con el mismo código de
// barras aparecen como sugerencia, el dueño los une, y en Productos el producto muestra
// los dos proveedores con el más barato como preferido; las ventas del absorbido siguen.
const TOKEN = "token-e2e-duplicados";
const EMAIL = "e2e-duplicados@ferre.test";
const ID_PROV_A = "00000000-0000-0000-0000-00000000e2f5";
const ID_PROV_B = "00000000-0000-0000-0000-00000000e2f6";
const ID_A = "00000000-0000-0000-0000-00000000e2f7";
const ID_B = "00000000-0000-0000-0000-00000000e2f8";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`UPDATE equivalencia_sugerida SET resuelto_por = NULL WHERE resuelto_por IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Dueño duplicados E2E', 'dueño')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  psql(`DELETE FROM equivalencia_sugerida WHERE producto_a IN ('${ID_A}', '${ID_B}') OR producto_b IN ('${ID_A}', '${ID_B}')`);
  psql(`DELETE FROM movimiento_stock WHERE producto_id IN ('${ID_A}', '${ID_B}')`);
  psql(`DELETE FROM item_venta WHERE producto_id IN ('${ID_A}', '${ID_B}')`);
  psql(`DELETE FROM precio_proveedor WHERE producto_id IN ('${ID_A}', '${ID_B}')`);
  psql(`DELETE FROM producto WHERE id IN ('${ID_A}', '${ID_B}')`);
  psql(`DELETE FROM proveedor WHERE id IN ('${ID_PROV_A}', '${ID_PROV_B}')`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV_A}', 'Proveedor caro (e2e)'), ('${ID_PROV_B}', 'Proveedor barato (e2e)')`);
  psql(`INSERT INTO producto (id, descripcion, marca, codigo_barras, proveedor_preferido_id, margen_elegido) VALUES ('${ID_A}', 'SILICONA DUPLICADA 280 ML (E2E)', 'MARCA E2E', '7790005550001', '${ID_PROV_A}', 100), ('${ID_B}', 'SILICONA DUPLICADA 280ML TRANSPARENTE (E2E)', 'MARCA E2E', '7790005550001', '${ID_PROV_B}', NULL)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_A}', '${ID_PROV_A}', 'SD-A', 3000, '[]', 3000, 0.21, '2026-09-01'), (gen_random_uuid(), '${ID_B}', '${ID_PROV_B}', 'SD-B', 2400, '[]', 2400, 0.21, '2026-09-05')`);
  // Una venta del producto B, que tiene que seguir existiendo después de la unión.
  psql(`INSERT INTO venta (id, fecha, medio_pago, total) VALUES ('00000000-0000-0000-0000-00000000e2f9', now(), 'efectivo', 5810) ON CONFLICT (id) DO NOTHING`);
  psql(`DELETE FROM item_venta WHERE venta_id = '00000000-0000-0000-0000-00000000e2f9'`);
  psql(`INSERT INTO item_venta (id, venta_id, orden, producto_id, descripcion, cantidad, precio_unitario) VALUES (gen_random_uuid(), '00000000-0000-0000-0000-00000000e2f9', 1, '${ID_B}', 'SILICONA DUPLICADA 280ML TRANSPARENTE (E2E)', 1, 5810)`);
});

test("sugerir, unir y ver el proveedor más barato como preferido", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/duplicados");
  await expect(page.getByRole("heading", { name: "Duplicados entre proveedores" })).toBeVisible();
  await page.getByTestId("buscar-duplicados").click();
  const sugerencia = page.getByTestId("sugerencia").filter({ hasText: "SILICONA DUPLICADA" });
  await expect(sugerencia).toBeVisible();
  await expect(sugerencia).toContainText("Mismo código de barras");
  await expect(sugerencia).toContainText("Proveedor caro (e2e)");
  await expect(sugerencia).toContainText("Proveedor barato (e2e)");

  await sugerencia.getByTestId("unir").click();
  await expect(page.getByTestId("mensaje")).toContainText("Unidos");
  // El absorbido queda inactivo y su venta ahora apunta al conservado; el preferido es el barato.
  expect(psql(`SELECT activo::text || ' ' || COALESCE(reemplazado_por::text, '') FROM producto WHERE id = '${ID_B}'`)).toBe(`false ${ID_A}`);
  expect(psql(`SELECT producto_id FROM item_venta WHERE venta_id = '00000000-0000-0000-0000-00000000e2f9'`)).toBe(ID_A);
  expect(psql(`SELECT proveedor_preferido_id FROM producto WHERE id = '${ID_A}'`)).toBe(ID_PROV_B);
  expect(psql(`SELECT count(DISTINCT proveedor_id) FROM precio_proveedor WHERE producto_id = '${ID_A}'`)).toBe("2");

  // En Productos: un solo producto, dos proveedores, el barato con estrella y el precio sobre su costo.
  await page.goto("/#/productos");
  await page.getByTestId("busqueda").fill("e2e silicona duplicada");
  await expect(page.getByTestId("producto")).toHaveCount(1);
  const fila = page.getByTestId("producto").first();
  await expect(fila.getByTestId("otros-proveedores")).toContainText("★ Proveedor barato (e2e) $2.400,00");
  await expect(fila.getByTestId("otros-proveedores")).toContainText("Proveedor caro (e2e) $3.000,00");
  await expect(fila.locator("td.precio")).toContainText("$6.000,00"); // 2400 × 2 × 1,21 = 5808 → 6000

  // Elegir el caro a mano: el precio sigue a ese costo.
  await fila.getByTestId("otros-proveedores").getByRole("button", { name: "usar" }).click();
  await expect(fila.locator("td.precio")).toContainText("$8.000,00", { timeout: 10000 }); // 3000 × 2 × 1,21 = 7260 → 8000
});
