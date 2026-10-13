import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Sin internet no se nota (issue #18): con la app ya abierta se corta la red, se vende y
// se cambia un margen; al volver la red todo llega al servidor una sola vez. Y la app
// vuelve a abrir sin red gracias al service worker.
const TOKEN = "token-e2e-sin-conexion";
const EMAIL = "e2e-sin-conexion@ferre.test";
const ID_PROV = "00000000-0000-0000-0000-00000000e2f0";
const ID_PROD = "00000000-0000-0000-0000-00000000e2f1";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM anomalia WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador sin conexión E2E', 'mostrador')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  psql(`DELETE FROM anomalia WHERE producto_id = '${ID_PROD}'`);
  psql(`DELETE FROM movimiento_stock WHERE producto_id = '${ID_PROD}'`);
  psql(`DELETE FROM item_venta WHERE producto_id = '${ID_PROD}'`);
  psql(`DELETE FROM consulta WHERE producto_id = '${ID_PROD}'`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id = '${ID_PROD}'`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', 'Proveedor sin conexión (e2e)')`);
  psql(`INSERT INTO producto (id, descripcion, marca, margen_elegido) VALUES ('${ID_PROD}', 'DESTORNILLADOR OFFLINE PH2 (E2E)', 'MARCA E2E', 100)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_PROD}', '${ID_PROV}', 'DO2', 500, '[]', 500, 0.21, '2026-08-11')`);
});

// En el celular, trabajar sin conexión es una preferencia que arranca deshabilitada (RF-81):
// así queda como si la persona la hubiera habilitado en Configuración.
const HABILITADO = JSON.stringify({ animaciones: true, sinConexion: true, buscar: "memoria" });

test("en el celular, sin habilitar el trabajo sin conexión no se guarda nada y sin red no se puede vender", async ({ page, context }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/vender");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  // Con conexión se trabaja igual: el catálogo está en memoria y se encuentra el producto (E08).
  await busqueda.fill("e2e destornillador offline");
  await busqueda.press("Enter");
  await expect(page.getByTestId("item").filter({ hasText: "DESTORNILLADOR OFFLINE" })).toBeVisible();
  // En el celular no quedó ninguna base con datos del negocio, y lo guardado no llega a 150 KB.
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((b) => b.name))).not.toContain("ferre");
  expect(await page.evaluate(() => Object.keys(localStorage).reduce((n, k) => n + k.length + (localStorage.getItem(k) ?? "").length, 0))).toBeLessThan(150_000);

  // Sin red (E09): no se registra ni se guarda, y dice cómo habilitarlo.
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByTestId("conexion-celular")).toContainText("no se puede registrar nada");
  await page.getByTestId("cobrar").click();
  await expect(page.getByText(/habilitalo en Más → Configuración/)).toBeVisible();
  await expect(page.getByTestId("exito")).toHaveCount(0);
  await expect(page.getByTestId("item")).toHaveCount(1);
  expect(await page.evaluate(async () => (await indexedDB.databases()).map((b) => b.name))).not.toContain("ferre");
  await context.setOffline(false);
  expect(psql(`SELECT count(*) FROM item_venta WHERE producto_id = '${ID_PROD}'`)).toBe("0");

  // La llave está en Configuración, deshabilitada de arranque (E07); habilitarla hace que el celular guarde (E10).
  await page.goto("/#/mas/configuracion");
  await expect(page.getByTestId("cfg-sin-conexion")).toHaveAttribute("aria-checked", "false");
  await page.getByTestId("cfg-sin-conexion").click();
  await expect(page.getByTestId("cfg-sin-conexion")).toHaveAttribute("aria-checked", "true");
  await page.goto("/#/vender");
  await expect.poll(async () => page.evaluate(async () => (await indexedDB.databases()).map((b) => b.name))).toContain("ferre");
});

test("vender y cambiar un margen sin red; al volver la red llega todo una sola vez", async ({ page, context }) => {
  await page.addInitScript(([token, preferencias]) => { localStorage.setItem("ferre.sesion", token!); localStorage.setItem("ferre.preferencias", preferencias!); }, [TOKEN, HABILITADO]);
  await page.goto("/#/vender");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  await expect(page.getByTestId("conexion-celular")).not.toContainText("Sin conexión");
  // Que el catálogo quede guardado en el dispositivo antes de cortar.
  await expect.poll(async () => page.evaluate(() => new Promise<number>((r) => { const p = indexedDB.open("ferre"); p.onsuccess = () => { const c = p.result.transaction("catalogo").objectStore("catalogo").count(); c.onsuccess = () => r(c.result); }; })), { timeout: 10000 }).toBeGreaterThan(0);

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByTestId("conexion-celular")).toContainText("Sin conexión");

  // Venta sin red: queda guardada y el mostrador sigue.
  await busqueda.fill("e2e destornillador offline");
  await expect(page.getByTestId("sugerencias")).toContainText("$2.000"); // 500 × 2 × 1,21 = 1210 → 2000
  await busqueda.press("Enter");
  await page.getByTestId("item").getByTestId("cantidad").fill("2");
  await expect(page.getByTestId("medio-efectivo")).toHaveAttribute("aria-checked", "true"); // viene elegido
  await page.getByTestId("cobrar").click();
  await expect(page.getByTestId("exito")).toContainText("Sin conexión: se envía sola");
  await page.getByTestId("cerrar-exito").click();
  await expect(page.getByTestId("conexion-celular")).toContainText("1 por enviar");

  // Cambio de margen sin red, desde la venta siguiente.
  await busqueda.fill("e2e destornillador offline");
  await busqueda.press("Enter");
  await page.getByTestId("item").getByTestId("margen").click();
  await page.getByTestId("item").getByRole("button", { name: "50 %", exact: true }).click();
  await expect(page.getByTestId("item")).toContainText("$1.000"); // 500 × 1,5 × 1,21 = 907,5 → 1000
  await page.getByRole("button", { name: "No llevó" }).click();
  await expect(page.getByTestId("conexion-celular")).toContainText("3 por enviar");
  expect(psql(`SELECT count(*) FROM item_venta WHERE producto_id = '${ID_PROD}'`)).toBe("0");

  // Vuelve la red: se envía todo, en orden, una sola vez.
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByTestId("conexion-celular")).toContainText("Sincronizado", { timeout: 15000 });
  expect(psql(`SELECT count(*) FROM item_venta WHERE producto_id = '${ID_PROD}'`)).toBe("1");
  // El producto no tenía stock cargado: se vendió igual, el stock no bajó de cero y quedó la anomalía (RF-59).
  expect(psql(`SELECT count(*) FROM movimiento_stock WHERE producto_id = '${ID_PROD}'`)).toBe("0");
  expect(psql(`SELECT count(*) FROM anomalia WHERE producto_id = '${ID_PROD}'`)).toBe("1");
  expect(psql(`SELECT margen_elegido FROM producto WHERE id = '${ID_PROD}'`)).toBe("50");
  expect(psql(`SELECT count(*) FROM consulta WHERE producto_id = '${ID_PROD}'`)).toBe("1");
});

test("con el trabajo sin conexión habilitado, la app abre sin red gracias al service worker", async ({ page, context }) => {
  await page.addInitScript(([token, preferencias]) => { localStorage.setItem("ferre.sesion", token!); localStorage.setItem("ferre.preferencias", preferencias!); }, [TOKEN, HABILITADO]);
  await page.goto("/#/vender");
  await expect(page.getByTestId("busqueda")).toBeEnabled();
  // Esperar a que el service worker controle la página y haya precacheado la app.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15000 }).toBe(true);
  await page.waitForTimeout(1000);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("busqueda")).toBeEnabled({ timeout: 15000 });
  await page.getByTestId("busqueda").fill("e2e destornillador offline");
  await expect(page.getByTestId("sugerencias")).toContainText("DESTORNILLADOR OFFLINE");
  await context.setOffline(false);
});
