import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Happy path "contar un sector y ajustar stock" (issue #31), en pantalla de celular: crear
// el sector, contar dos productos (uno coincide, otro no), cerrar, y verificar que la
// diferencia quedó como ajuste explicado y que el sector muestra su último conteo.
test.use({ viewport: { width: 390, height: 844 } });

const TOKEN = "token-e2e-contar";
const EMAIL = "e2e-contar@ferre.test";
const SECTOR = "Estantería E2E";
const ID_PROV = "00000000-0000-0000-0000-00000000e2ec";
const ID_A = "00000000-0000-0000-0000-00000000e2ed";
const ID_B = "00000000-0000-0000-0000-00000000e2ee";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`UPDATE conteo SET abierto_por = NULL, cerrado_por = NULL WHERE abierto_por IN (SELECT id FROM usuario WHERE email = '${EMAIL}') OR cerrado_por IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`UPDATE renglon_conteo SET contado_por = NULL WHERE contado_por IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador contar E2E', 'mostrador')`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  // Sector y productos limpios.
  psql(`DELETE FROM renglon_conteo WHERE conteo_id IN (SELECT id FROM conteo WHERE sector_id IN (SELECT id FROM sector WHERE nombre = '${SECTOR}'))`);
  psql(`DELETE FROM renglon_conteo WHERE producto_id IN ('${ID_A}', '${ID_B}')`); // también de conteos de otros sectores
  psql(`DELETE FROM movimiento_stock WHERE producto_id IN ('${ID_A}', '${ID_B}')`);
  psql(`DELETE FROM conteo WHERE sector_id IN (SELECT id FROM sector WHERE nombre = '${SECTOR}')`);
  psql(`UPDATE producto SET sector_id = NULL WHERE sector_id IN (SELECT id FROM sector WHERE nombre = '${SECTOR}')`);
  psql(`DELETE FROM sector WHERE nombre = '${SECTOR}'`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id IN ('${ID_A}', '${ID_B}')`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', 'Proveedor contar (e2e)')`);
  psql(`INSERT INTO producto (id, descripcion, marca) VALUES ('${ID_A}', 'LIJA CONTAR GRANO 80 (E2E)', 'MARCA E2E'), ('${ID_B}', 'PINCEL CONTAR N 10 (E2E)', 'MARCA E2E')`);
  psql(`INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, fecha) VALUES (gen_random_uuid(), '${ID_A}', 'compra', 10, 'compra', '2026-09-01'), (gen_random_uuid(), '${ID_B}', 'compra', 5, 'compra', '2026-09-01')`);
});

test("contar un sector desde el celular y cerrarlo con ajustes", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/contar");
  // Sector nuevo: se crea y se abre.
  await page.getByTestId("sector-nuevo").click();
  await page.getByPlaceholder(/Sector nuevo/).fill(SECTOR);
  await page.getByRole("button", { name: "Agregar sector" }).click();
  await expect(page.getByRole("heading", { name: SECTOR })).toBeVisible();

  // Primer producto: había 10, hay 8.
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  await busqueda.fill("e2e lija contar");
  await busqueda.press("Enter");
  await expect(page.getByTestId("contando")).toContainText("LIJA CONTAR");
  await page.getByTestId("cantidad").fill("8");
  await page.getByTestId("siguiente").click();
  const contados = page.getByTestId("contados");
  await expect(contados.getByRole("row", { name: /LIJA CONTAR/ })).toContainText("-2");

  // Segundo producto: coincide.
  await page.getByTestId("busqueda").fill("e2e pincel contar");
  await page.getByTestId("busqueda").press("Enter");
  await page.getByTestId("cantidad").fill("5");
  await page.getByTestId("cantidad").press("Enter");
  await expect(contados.getByRole("row", { name: /PINCEL CONTAR/ })).toContainText("=");

  // Cerrar: un ajuste de −2 explicado; el otro producto no cambia.
  await page.getByTestId("cerrar").click();
  await page.getByTestId("cerrar-confirmar").click();
  await expect(page.getByTestId("resultado-conteo")).toContainText("2 productos contados, 1 con diferencia ajustada");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_A}'`)).toBe("8.000");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_B}'`)).toBe("5.000");
  expect(psql(`SELECT nota FROM movimiento_stock WHERE producto_id = '${ID_A}' AND referencia_tipo = 'conteo'`)).toContain(`conteo de ${SECTOR} del`);
  expect(psql(`SELECT nota FROM movimiento_stock WHERE producto_id = '${ID_A}' AND referencia_tipo = 'conteo'`)).toContain("había 10, hay 8");
  expect(psql(`SELECT count(*) FROM producto WHERE sector_id = (SELECT id FROM sector WHERE nombre = '${SECTOR}')`)).toBe("2");

  // El sector muestra que se contó hoy.
  await page.getByRole("button", { name: "Contar otro sector" }).click();
  await expect(page.getByTestId("sectores").getByRole("button", { name: new RegExp(SECTOR) })).toContainText("contado hoy");
});
