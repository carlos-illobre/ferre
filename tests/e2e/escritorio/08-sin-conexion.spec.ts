import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { archivosSinCachear } from "../comun/dispositivo";
import { stack } from "../comun/stack";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { psql } = stack("escritorio");

// Sin internet no se nota (issue #18): con la app ya abierta se corta la red, se vende y
// se cambia un margen; al volver la red todo llega al servidor una sola vez. Y la app
// vuelve a abrir sin red gracias al service worker.
const TOKEN = "token-e2e-sin-conexion";
const EMAIL = "e2e-sin-conexion@ferre.test";
const ID_PROV = "00000000-0000-0000-0000-00000000e2f0";
const ID_PROD = "00000000-0000-0000-0000-00000000e2f1";

test.beforeAll(() => {
  psql(`DELETE FROM anomalia WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
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

// Los datos para buscar sin conexión se bajan a mano, en Configuración (specs/018, historia 5). En la
// computadora «Trabajar sin conexión» arranca habilitada (018-E30).
async function bajarLosDatos(page: import("@playwright/test").Page) {
  await page.goto("/#/configuracion");
  await expect(page.getByTestId("cfg-sin-conexion")).toHaveAttribute("aria-checked", "true");
  await expect(page.getByTestId("cfg-descargar")).toBeEnabled();
  await page.getByTestId("cfg-descargar").click();
  await expect(page.getByTestId("cfg-descargar")).toHaveText("Actualizar", { timeout: 60_000 });
}

test("vender y cambiar un margen sin red; al volver la red llega todo una sola vez", async ({ page, context }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await bajarLosDatos(page);
  // «Actualizar» trae solo lo que cambió desde la descarga anterior, con la marca del servidor (018-E25).
  const pedidos: string[] = [];
  page.on("request", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/productos/descarga")) pedidos.push(u.search); });
  psql(`UPDATE producto SET margen_elegido = 100 WHERE id = '${ID_PROD}'`);
  await page.getByTestId("cfg-descargar").click();
  await expect(page.getByTestId("cfg-descargar")).toHaveText("Actualizar", { timeout: 60_000 });
  await expect.poll(() => pedidos.length).toBeGreaterThan(0);
  expect(pedidos.every((q) => /[?&]marca=\d+/.test(q))).toBe(true);
  await page.goto("/#/vender");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  await expect(page.getByTestId("conexion")).not.toContainText("Sin conexión");

  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.getByTestId("conexion")).toContainText("Sin conexión");

  // Venta sin red: queda guardada y el mostrador sigue.
  await busqueda.fill("e2e destornillador offline");
  await expect(page.getByTestId("sugerencias")).toContainText("$2.000"); // 500 × 2 × 1,21 = 1210 → 2000
  await busqueda.press("Enter");
  await page.getByTestId("item").getByTestId("cantidad").fill("2");
  await expect(page.getByTestId("medio-efectivo")).toHaveAttribute("aria-checked", "true"); // viene elegido
  await page.getByTestId("cobrar").click();
  await expect(page.getByTestId("exito")).toContainText(/sin conexión/i);
  await page.getByTestId("cerrar-exito").click();
  await expect(page.getByTestId("conexion")).toContainText("1 cambio por enviar");

  // Cambio de margen sin red, desde la venta siguiente.
  await busqueda.fill("e2e destornillador offline");
  await busqueda.press("Enter");
  await page.getByTestId("item").getByTestId("margen-50").click();
  await expect(page.getByTestId("item")).toContainText("$1.000"); // 500 × 1,5 × 1,21 = 907,5 → 1000
  await page.getByTestId("no-llevo").click();
  await expect(page.getByTestId("conexion")).toContainText("3 cambios por enviar");
  await expect.poll(() => psql(`SELECT count(*) FROM item_venta WHERE producto_id = '${ID_PROD}'`)).toBe("0");

  // Vuelve la red: se envía todo, en orden, una sola vez.
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByTestId("conexion")).toContainText("Sincronizado", { timeout: 15000 });
  await expect.poll(() => psql(`SELECT count(*) FROM item_venta WHERE producto_id = '${ID_PROD}'`)).toBe("1");
  // El producto no tenía stock cargado: se vendió igual, el stock no bajó de cero y quedó la anomalía (RF-59).
  await expect.poll(() => psql(`SELECT count(*) FROM movimiento_stock WHERE producto_id = '${ID_PROD}'`)).toBe("0");
  await expect.poll(() => psql(`SELECT count(*) FROM anomalia WHERE producto_id = '${ID_PROD}'`)).toBe("1");
  await expect.poll(() => psql(`SELECT margen_elegido FROM producto WHERE id = '${ID_PROD}'`)).toBe("50");
  await expect.poll(() => psql(`SELECT count(*) FROM consulta WHERE producto_id = '${ID_PROD}'`)).toBe("1");
});

test("la app abre sin red gracias al service worker", async ({ page, context }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await bajarLosDatos(page);
  await page.goto("/#/vender");
  await expect(page.getByTestId("busqueda")).toBeEnabled();
  // Esperar a que el service worker controle la página y haya precacheado la app.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 15000 }).toBe(true);
  await expect.poll(() => archivosSinCachear(page), { timeout: 15000 }).toBe(0);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId("busqueda")).toBeEnabled({ timeout: 15000 });
  await page.getByTestId("busqueda").fill("e2e destornillador offline");
  await expect(page.getByTestId("sugerencias")).toContainText("DESTORNILLADOR OFFLINE", { ignoreCase: true }); // el nombre, como frase (decisión 127)
  await context.setOffline(false);
});
