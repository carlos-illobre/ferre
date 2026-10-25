import { test, expect } from "@playwright/test";
import { buscarEnVender } from "../comun/cobrar";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { psql } = stack("celular");

// Happy path "ver el stock valorizado" (issue #33): con una compra y una venta cargadas,
// la pantalla muestra el stock como suma de movimientos, el valor como stock × costo, la
// valorización total, y permite corregir con "hay tantas" dejando el ajuste explicado.
const TOKEN = "token-e2e-stock";
const EMAIL = "e2e-stock@ferre.test";
const ID_PROV = "00000000-0000-0000-0000-00000000e2ea";
const ID_PROD = "00000000-0000-0000-0000-00000000e2eb";

test.beforeAll(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador stock E2E', 'mostrador')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
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
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await page.goto("/#/deposito/stock");
  // Inventario muestra las cantidades y, con «Ver el dinero invertido», el dinero (decisión 96).

  await page.getByTestId("busqueda").fill("e2e candado stock");
  const fila = page.getByTestId("fila-stock").filter({ hasText: "CANDADO STOCK 40 MM" });
  await expect(fila.getByTestId("stock")).toContainText("17");
  await expect(page.getByTestId("dinero-invertido-stock")).toBeVisible();

  // La explicación del número: sus movimientos, en la hoja del producto (como la v2).
  await fila.getByTestId("stock").click();
  const hoja = page.getByTestId("detalle-stock");
  // 013-E10: quien prueba tiene el rol Gerente: ve el valor del producto (17 × $2.500) y el total.
  await expect(hoja.getByTestId("valor-stock")).toContainText("$42.500");
  const movimientos = page.getByTestId("movimientos");
  await expect(movimientos).toContainText("Compra");
  await expect(movimientos).toContainText("+20");
  await expect(movimientos).toContainText("−3"); // el menos tipográfico, como la v2
  await expect(hoja).toContainText("Es la suma de sus");

  // Corregir: "hay 15", con motivo. Queda un ajuste de −2 explicado.
  await hoja.getByTestId("cantidad-real").fill("15");
  await hoja.getByRole("button", { name: "Otro…" }).click();
  await hoja.getByTestId("motivo").fill("conté la estantería");
  await page.getByTestId("guardar-ajuste").click();
  await expect(fila.getByTestId("stock")).toContainText("15");
  // Guardar cierra la hoja; al volver a abrirla está el ajuste explicado.
  await fila.getByTestId("stock").click();
  await expect(movimientos).toContainText("Conteo");
  await expect(movimientos).toContainText("había 17, hay 15: conté la estantería");
  await expect.poll(() => psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_PROD}'`)).toBe("15.000");

  // En la venta se ve el stock del producto.
  await page.goto("/#/vender");
  // La búsqueda de Vender, en su hoja (decisión 140): cada producto con su stock.
  await buscarEnVender(page, "e2e candado stock");
  await expect(page.getByTestId("sugerencias")).toContainText("15 un.");
});
