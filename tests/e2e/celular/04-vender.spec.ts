import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Happy path "buscar un producto y registrar una venta" (issue #15): el empleado busca,
// agrega con Enter, cambia la cantidad, elige cómo paga y cobra. La venta queda con el
// stock descontado, aparece en "Ventas de hoy" y se puede anular. Sesión sembrada.
const TOKEN = "token-e2e-vender";
const EMAIL = "e2e-vender@ferre.test";
const PROVEEDOR = "Proveedor vender (e2e)";
const ID_PROV = "00000000-0000-0000-0000-00000000e2e5";
const ID_MECHA = "00000000-0000-0000-0000-00000000e2e6";
const ID_TORNILLO = "00000000-0000-0000-0000-00000000e2e7";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM anomalia WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador vender E2E', 'mostrador')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  psql(`DELETE FROM anomalia WHERE producto_id IN ('${ID_MECHA}', '${ID_TORNILLO}')`);
  psql(`DELETE FROM movimiento_stock WHERE producto_id IN ('${ID_MECHA}', '${ID_TORNILLO}')`);
  psql(`DELETE FROM item_venta WHERE producto_id IN ('${ID_MECHA}', '${ID_TORNILLO}')`);
  psql(`DELETE FROM consulta WHERE producto_id IN ('${ID_MECHA}', '${ID_TORNILLO}')`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id IN ('${ID_MECHA}', '${ID_TORNILLO}')`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', '${PROVEEDOR}')`);
  psql(`INSERT INTO producto (id, descripcion, marca, margen_elegido) VALUES ('${ID_MECHA}', 'MECHA VENDER 8 MM (E2E)', 'MARCA E2E', 100), ('${ID_TORNILLO}', 'TORNILLO VENDER 4X40 (E2E)', 'MARCA E2E', NULL)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_MECHA}', '${ID_PROV}', 'MV8', 1000, '[]', 1000, 0.21, '2026-08-11'), (gen_random_uuid(), '${ID_TORNILLO}', '${ID_PROV}', 'TV440', 10, '[]', 10, 0.21, '2026-08-11')`);
  // La mecha arranca con 10 en stock; el tornillo, sin nada: su venta deja una anomalía (RF-59).
  psql(`INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, fecha, nota) VALUES (gen_random_uuid(), '${ID_MECHA}', 'ajuste', 10, 'conteo', now(), 'stock inicial e2e')`);
});

test("buscar, agregar, cobrar en efectivo, ver la venta del día y anularla", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/vender");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  // En el celular la búsqueda no toma el foco sola.
  await expect(busqueda).not.toBeFocused();

  // Producto con margen guardado: Enter lo agrega ya con precio (1000 × 2 × 1,21 = 2420 → $3.000).
  await busqueda.fill("e2e mecha vender");
  await expect(page.getByTestId("sugerencias")).toContainText("$3.000");
  await busqueda.press("Enter");
  const mecha = page.getByTestId("item").filter({ hasText: "MECHA VENDER 8 MM" });
  await expect(mecha).toBeVisible();
  await expect(busqueda).toHaveValue("");
  await expect(busqueda).toBeFocused();
  await expect(page.getByTestId("total")).toContainText("$3.000");

  // Cantidad 3; la flechita suma de a 1 (enteras, sin decimales); 2,7 por unidad es 2.
  await mecha.getByTestId("cantidad").fill("3");
  await expect(page.getByTestId("total")).toContainText("$9.000");
  await mecha.getByRole("button", { name: "Más" }).click();
  await expect(mecha.getByTestId("cantidad")).toHaveValue("4");
  await mecha.getByTestId("cantidad").fill("2.7");
  await expect(mecha.getByTestId("cantidad")).toHaveValue("2");
  await mecha.getByTestId("cantidad").fill("3");
  await expect(page.getByTestId("total")).toContainText("$9.000");

  // Producto sin margen: queda en rojo hasta elegirlo en la fila; cualquier margen sobre $10 redondea a $1.000.
  await busqueda.fill("e2e tornillo vender");
  await busqueda.press("Enter");
  const tornillo = page.getByTestId("item").filter({ hasText: "TORNILLO VENDER" });
  await expect(tornillo).toContainText("elegí margen");
  await page.getByTestId("cobrar").click();
  await expect(page.getByRole("alert")).toContainText("sin precio");
  await tornillo.getByRole("button", { name: "300 %", exact: true }).click(); // 10 × 4 × 1,21 = 48,4 → $1.000
  await expect(tornillo).toContainText("$1.000");
  await expect(page.getByTestId("total")).toContainText("$10.000");
  // Por kilo: admite un decimal (1,5 kg) y queda guardado en el producto. 1,5 kg × $1.000 =
  // $1.500: el renglón se redondea para arriba a $2.000 para no dar vuelto (RF-19).
  await tornillo.getByTestId("unidad").selectOption("kg");
  await tornillo.getByTestId("cantidad").fill("1.5");
  await expect(page.getByTestId("total")).toContainText("$11.000");

  // Efectivo viene elegido (decisión 37); el total se lee fuera del botón Cobrar.
  await expect(page.getByTestId("medio-efectivo")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("cobrar")).toHaveText("Cobrar");
  await page.getByTestId("cobrar").click();
  // Pantalla de éxito con el importe grande; "Nueva venta" vuelve a la búsqueda vacía.
  await expect(page.getByTestId("exito")).toContainText("Venta registrada");
  await expect(page.getByTestId("exito")).toContainText("$11.000");
  await expect(page.getByTestId("exito")).toContainText("Efectivo");
  await page.getByTestId("cerrar-exito").click();
  await expect(page.getByTestId("exito")).toHaveCount(0);
  await expect(page.getByTestId("item")).toHaveCount(0);

  // Quedó en la base con el stock descontado y el precio explicado.
  expect(psql(`SELECT count(*) FROM venta v JOIN item_venta i ON i.venta_id = v.id WHERE i.producto_id = '${ID_MECHA}' AND v.estado = 'confirmada'`)).toBe("1");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("7.000");
  // El tornillo no tenía stock: se vendió igual, su stock no bajó de cero y quedó la anomalía.
  expect(psql(`SELECT count(*) FROM movimiento_stock WHERE producto_id = '${ID_TORNILLO}'`)).toBe("0");
  expect(psql(`SELECT count(*) FROM anomalia WHERE producto_id = '${ID_TORNILLO}' AND tipo = 'venta_sin_stock'`)).toBe("1");
  expect(psql(`SELECT margen_aplicado FROM item_venta WHERE producto_id = '${ID_TORNILLO}' ORDER BY creado_en DESC LIMIT 1`)).toBe("300");
  expect(psql(`SELECT unidad FROM producto WHERE id = '${ID_TORNILLO}'`)).toBe("kg");
  expect(psql(`SELECT explicacion->'pasos'->>1 FROM item_venta WHERE producto_id = '${ID_MECHA}' ORDER BY creado_en DESC LIMIT 1`)).toContain("+ 100 % de margen");

  // Negocio muestra las ventas de hoy, con cada producto en su renglón; anular la marca y devuelve el stock.
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("button", { name: /Cómo va el negocio/ }).click();
  const hoy = page.getByTestId("ventas-de-hoy");
  const venta = hoy.getByTestId("venta-dia").filter({ hasText: "MECHA VENDER" });
  await expect(venta).toContainText("3 × MECHA VENDER");
  await expect(venta).toContainText("1.5 × TORNILLO VENDER");
  await expect(venta).toContainText("Efectivo");
  await expect(venta).toContainText("$11.000,00");
  page.once("dialog", (d) => d.accept("se arrepintió"));
  await venta.getByRole("button", { name: "Anular" }).click();
  await expect(venta).toContainText("anulada");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("10.000");
  // La anomalía se ve en Más > Anomalías.
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("button", { name: /Anomalías/ }).click();
  await expect(page.getByTestId("anomalia").filter({ hasText: "TORNILLO VENDER" })).toContainText("Venta sin stock");
  await page.getByRole("button", { name: "Vender" }).click();

  // "No llevó": la consulta queda registrada.
  await busqueda.fill("e2e mecha vender");
  await busqueda.press("Enter");
  await page.getByRole("button", { name: "No llevó" }).click();
  await expect(page.getByTestId("mensaje")).toContainText("Anotado como «No llevó»");
  await expect.poll(() => psql(`SELECT count(*) FROM consulta WHERE producto_id = '${ID_MECHA}'`)).toBe("1");
});
