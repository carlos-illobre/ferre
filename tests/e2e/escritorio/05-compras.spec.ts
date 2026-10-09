import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Happy path "ingresar mercadería de un proveedor" (issue #30): el empleado elige proveedor
// y comprobante, agrega dos renglones, uno con el costo de la factura distinto al de la
// lista, y registra. El stock sube, el costo vigente cambia con su explicación, el gasto
// de la semana lo muestra, y anular devuelve el stock.
const TOKEN = "token-e2e-compras";
const EMAIL = "e2e-compras@ferre.test";
const PROVEEDOR = "Proveedor compras (e2e)";
const ID_PROV = "00000000-0000-0000-0000-00000000e2e8";
const ID_CINTA = "00000000-0000-0000-0000-00000000e2e9";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador compras E2E', 'mostrador')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  // Limpieza en orden de dependencias: compras del proveedor y sus renglones, movimientos, precios, productos.
  psql(`DELETE FROM movimiento_stock WHERE referencia_id IN (SELECT id FROM compra WHERE proveedor_id = '${ID_PROV}') OR producto_id = '${ID_CINTA}'`);
  psql(`DELETE FROM item_compra WHERE compra_id IN (SELECT id FROM compra WHERE proveedor_id = '${ID_PROV}')`);
  psql(`DELETE FROM compra WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id = '${ID_CINTA}' OR (proveedor_preferido_id = '${ID_PROV}' AND id NOT IN (SELECT producto_id FROM item_venta))`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', '${PROVEEDOR}')`);
  psql(`INSERT INTO producto (id, descripcion, marca, margen_elegido) VALUES ('${ID_CINTA}', 'CINTA AISLADORA COMPRAS (E2E)', 'MARCA E2E', 100)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_CINTA}', '${ID_PROV}', 'CA20', 1000, '[]', 1000, 0.21, '2026-08-01')`);
});

test("ingresar mercadería: stock, costo según factura, gasto de la semana y anulación", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/compras");
  await expect(page.getByRole("heading", { name: "Ingreso de mercadería" })).toBeVisible();
  await page.getByTestId("proveedor").selectOption({ label: PROVEEDOR });
  await page.getByTestId("numero").fill("0001-00000777");

  // Producto conocido: el costo viene de la lista ($1.000); la factura dice $1.200.
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  await busqueda.fill("e2e cinta aisladora compras");
  await busqueda.press("Enter");
  const cinta = page.getByTestId("renglon").filter({ hasText: "CINTA AISLADORA COMPRAS" });
  await expect(cinta).toContainText("$1.000,00");
  await cinta.getByTestId("cantidad").fill("10");
  await cinta.getByTestId("costo").fill("1200");
  await expect(cinta).toContainText("+20 %");

  // Producto nuevo, que no estaba en ninguna lista.
  await busqueda.fill("PINCEL NUEVO COMPRAS (E2E)");
  await busqueda.press("Enter");
  // El renglón libre muestra la descripción en un input (no es texto): es el segundo renglón.
  const pincel = page.getByTestId("renglon").nth(1);
  await expect(pincel.locator("input.libre")).toHaveValue("PINCEL NUEVO COMPRAS (E2E)");
  await pincel.getByTestId("cantidad").fill("5");
  await pincel.getByTestId("costo").fill("800");
  await expect(page.getByTestId("total")).toContainText("$16.000,00"); // 10 × 1200 + 5 × 800

  await page.getByTestId("confirmar").click();
  await expect(page.getByTestId("mensaje")).toContainText("Compra registrada: $16.000,00");
  await expect(page.getByTestId("mensaje")).toContainText("2 costo(s) actualizado(s)");
  await expect(page.getByTestId("mensaje")).toContainText("1 producto(s) nuevo(s)");

  // Stock, costo vigente con explicación, gasto de la semana.
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_CINTA}'`)).toBe("10.000");
  expect(psql(`SELECT costo_neto FROM precio_proveedor WHERE producto_id = '${ID_CINTA}' ORDER BY fecha_lista DESC, creado_en DESC LIMIT 1`)).toBe("1200.0000");
  expect(psql(`SELECT descuentos->'explicacion'->>0 FROM precio_proveedor WHERE producto_id = '${ID_CINTA}' ORDER BY fecha_lista DESC, creado_en DESC LIMIT 1`)).toContain("según factura 0001-00000777");
  expect(psql(`SELECT count(*) FROM producto WHERE descripcion = 'PINCEL NUEVO COMPRAS (E2E)' AND proveedor_preferido_id = '${ID_PROV}'`)).toBe("1");
  await expect(page.getByTestId("gastos-semana")).toContainText(PROVEEDOR);

  // Anular devuelve el stock; el costo según factura se mantiene.
  const recientes = page.getByTestId("compras-recientes");
  // La compra se despliega y muestra sus dos renglones.
  const compra = recientes.getByTestId("compra-reciente").filter({ hasText: PROVEEDOR }).first();
  await expect(compra.getByRole("row")).toHaveCount(1);
  await compra.getByRole("row").first().click();
  await expect(compra.getByRole("row")).toHaveCount(3);
  await expect(compra.getByRole("row").nth(1)).toContainText("10 × CINTA AISLADORA");
  await expect(compra.getByRole("row").nth(2)).toContainText("5 × PINCEL NUEVO");
  page.once("dialog", (d) => d.accept("error de carga"));
  await compra.getByRole("button", { name: "Anular" }).click();
  await expect(compra).toContainText("anulada");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_CINTA}'`)).toBe("0.000");
});
