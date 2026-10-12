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
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
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
  await expect(busqueda).toBeFocused();

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
  await mecha.getByTestId("cantidad").press("ArrowUp");
  await expect(mecha.getByTestId("cantidad")).toHaveValue("4");
  await mecha.getByTestId("cantidad").fill("2.7");
  await expect(mecha.getByTestId("cantidad")).toHaveValue("2");
  await mecha.getByTestId("cantidad").fill("3");
  await expect(page.getByTestId("total")).toContainText("$9.000");

  // Producto sin margen: queda en rojo hasta elegirlo en la fila; cualquier margen sobre $10 redondea a $1.000.
  await busqueda.fill("e2e tornillo vender");
  await busqueda.press("Enter");
  const tornillo = page.getByTestId("item").filter({ hasText: "TORNILLO VENDER" });
  await expect(tornillo.getByTestId("sin-precio")).toBeVisible();
  await page.getByTestId("cobrar").click();
  await expect(page.getByTestId("error-cobro")).toContainText("sin precio");
  await tornillo.getByTestId("margen-300").click(); // 10 × 4 × 1,21 = 48,4 → $1.000
  await expect(tornillo).toContainText("$1.000");
  await expect(page.getByTestId("total")).toContainText("$10.000");
  // Por kilo: admite un decimal (1,5 kg) y queda guardado en el producto. 1,5 kg × $1.000 =
  // $1.500: el renglón se redondea para arriba a $2.000 para no dar vuelto (RF-19).
  await tornillo.getByTestId("unidad").selectOption("kg");
  await tornillo.getByTestId("cantidad").fill("1.5");
  await expect(page.getByTestId("total")).toContainText("$11.000");

  // Efectivo viene elegido (decisión 37): cobrar registra.
  await expect(page.getByTestId("medio-efectivo")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("cobrar").click();
  await expect(page.getByTestId("exito")).toContainText("Venta registrada");
  await expect(page.getByTestId("exito")).toContainText("$11.000");
  await page.getByTestId("cerrar-exito").click();
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

  // Ventas de hoy la muestra; anular la marca y devuelve el stock.
  await page.getByTestId("hoy").click();
  const hoy = page.getByTestId("ventas-de-hoy");
  await expect(hoy).toContainText("Efectivo");
  const venta = hoy.getByTestId("venta-dia").filter({ hasText: "MECHA VENDER" });
  await expect(venta).toContainText("TORNILLO VENDER");
  await venta.getByRole("button", { name: "Anular" }).click();
  await page.getByTestId("motivo-anular").fill("se arrepintió");
  await page.getByTestId("confirmar-anular").click();
  await expect(venta).toContainText(/anulada/i);
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("10.000");

  // La anomalía del tornillo se ve en Más > Anomalías.
  await page.getByTestId("menu-mas").click();
  await page.getByTestId("mas-anomalias").click();
  await expect(page.getByTestId("anomalia").filter({ hasText: "TORNILLO VENDER" }).first()).toContainText("Venta sin stock");

  // "No llevó": la consulta queda registrada.
  await page.getByTestId("menu-vender").click();
  await busqueda.fill("e2e mecha vender");
  await busqueda.press("Enter");
  await page.getByTestId("no-llevo").click();
  await expect(page.getByTestId("mensaje")).toContainText("Anotado como «No llevó»");
  await expect.poll(() => psql(`SELECT count(*) FROM consulta WHERE producto_id = '${ID_MECHA}'`)).toBe("1");
});

// Todo con el teclado (decisión 61, RNF-05): el menú, las pestañas y una venta completa, sin mouse.
test("sin mouse: recorrer el menú y las pestañas con las flechas y cobrar una venta", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/productos");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeFocused();
  const fila = () => page.evaluate(() => [...document.querySelectorAll("[data-testid=producto]")].findIndex((f) => f.getAttribute("aria-selected") === "true"));
  const elegida = await fila();

  // ← lleva al menú; ahí ↑ ↓ lo recorren sin mover la lista de productos, hasta Vincular y Salir.
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();
  for (const destino of ["menu-vender", "menu-deposito", "menu-mas", "emparejar-celular", "salir", "menu-catalogo"]) {
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId(destino)).toBeFocused();
  }
  expect(await fila()).toBe(elegida);

  // → entra a las pestañas; ← → pasan de una a otra y la abren; ← desde la primera vuelve al menú.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pestana-listas")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("pestana-listas")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("pestana-productos")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();

  // Vender no tiene pestañas: → va derecho a su búsqueda. La venta entera, con el teclado.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pestana-productos")).toHaveCount(0);
  await expect(page.getByTestId("busqueda")).toBeFocused();
  await page.keyboard.type("e2e mecha vender");
  await expect(page.getByTestId("sugerencias")).toContainText("MECHA VENDER");
  await page.keyboard.press("Enter");
  const mecha = page.getByTestId("item").filter({ hasText: "MECHA VENDER 8 MM" });
  await expect(mecha).toBeVisible();
  const conElFoco = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? "");
  // ↓ recorre los controles del renglón hasta la cantidad; ahí ↑ suma, y → sigue hasta Cobrar.
  for (let i = 0; i < 40 && (await conElFoco()) !== "cantidad"; i++) await page.keyboard.press("ArrowDown");
  await expect(mecha.getByTestId("cantidad")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(mecha.getByTestId("cantidad")).toHaveValue("2");
  for (let i = 0; i < 20 && (await conElFoco()) !== "cobrar"; i++) await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("cobrar")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("exito")).toContainText("Venta registrada");
  await expect(page.getByTestId("exito")).toContainText("$6.000"); // 2 × $3.000
});
