import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

const CELULAR = false;

// Pedidos a proveedores (RF-55, decisión 52): armar un pedido, mandarlo por WhatsApp, ingresar
// la mercadería desde el pedido cuando llega en parte, y cerrarlo incompleto.
const TOKEN = "token-e2e-pedidos";
const EMAIL = "e2e-pedidos@ferre.test";
const PROVEEDOR = "Proveedor pedidos (e2e)";
const ID_PROV = "00000000-0000-0000-0000-0000000ed001";
const ID_MECHA = "00000000-0000-0000-0000-0000000ed002";
const ID_DISCO = "00000000-0000-0000-0000-0000000ed003";
const FOTO = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
const RUTA = CELULAR ? "deposito/pedidos" : "pedidos";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  // Limpieza en orden de dependencias: compras y pedidos del proveedor, movimientos, precios, productos, usuario.
  psql(`DELETE FROM movimiento_stock WHERE producto_id IN ('${ID_MECHA}', '${ID_DISCO}')`);
  psql(`DELETE FROM foto_comprobante WHERE compra_id IN (SELECT id FROM compra WHERE proveedor_id = '${ID_PROV}') OR usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM item_compra WHERE compra_id IN (SELECT id FROM compra WHERE proveedor_id = '${ID_PROV}')`);
  psql(`DELETE FROM compra WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM pedido WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id IN ('${ID_MECHA}', '${ID_DISCO}')`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), '${EMAIL}', 'Compradora E2E')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', '${PROVEEDOR}')`);
  psql(`INSERT INTO producto (id, descripcion, marca, margen_elegido) VALUES ('${ID_MECHA}', 'MECHA PEDIDOS 6 MM (E2E)', 'MARCA E2E', 100), ('${ID_DISCO}', 'DISCO PEDIDOS 115 MM (E2E)', 'MARCA E2E', 100)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_MECHA}', '${ID_PROV}', 'PE-MECHA', 2000, '[]', 2000, 0.21, '2026-08-01'), (gen_random_uuid(), '${ID_DISCO}', '${ID_PROV}', 'PE-DISCO', 1000, '[]', 1000, 0.21, '2026-08-01')`);
});

test("armar un pedido, mandarlo, recibirlo en parte desde el ingreso y cerrarlo incompleto", async ({ page }) => {
  // WhatsApp no se abre de verdad: se anota a dónde se quiso ir.
  await page.addInitScript((token) => {
    localStorage.setItem("ferre.sesion", token);
    window.open = ((url: string) => { (window as unknown as { __abierto: string }).__abierto = String(url); return null; }) as typeof window.open;
  }, TOKEN);
  await page.goto(`/#/${RUTA}`);

  // Armar: proveedor, dos productos, cantidades.
  await page.getByTestId("pedido-nuevo").click();
  await page.getByTestId("proveedor-opcion").filter({ hasText: PROVEEDOR }).click();
  const buscar = page.getByTestId("buscar-para-pedir");
  await expect(buscar).toBeEnabled();
  for (const texto of ["e2e mecha pedidos", "e2e disco pedidos"]) {
    await buscar.fill(texto);
    await page.getByTestId("resultado-para-pedir").first().click();
  }
  const mecha = page.getByTestId("renglon-pedido").filter({ hasText: "MECHA PEDIDOS" });
  const disco = page.getByTestId("renglon-pedido").filter({ hasText: "DISCO PEDIDOS" });
  await mecha.getByTestId("cantidad-pedido").fill("10");
  await mecha.getByTestId("cantidad-pedido").blur();
  await disco.getByTestId("cantidad-pedido").fill("4");
  await disco.getByTestId("cantidad-pedido").blur();
  await expect(page.getByTestId("total-estimado")).toHaveText("$24.000"); // 10 × 2000 + 4 × 1000

  // Mandar: el mensaje lleva código, descripción y cantidad, sin costos; el WhatsApp queda guardado.
  await page.getByTestId("revisar-y-mandar").click();
  const hoja = page.getByTestId("hoja-mandar");
  await expect(hoja.getByTestId("mensaje-pedido")).toContainText("10 × MECHA PEDIDOS 6 MM (E2E) (PE-MECHA)");
  await expect(hoja.getByTestId("mensaje-pedido")).not.toContainText("$");
  await hoja.getByTestId("whatsapp-proveedor").fill("54 9 11 5555-0101");
  await hoja.getByTestId("mandar-whatsapp").click();
  await expect(page.getByTestId("mensaje-pedidos")).toContainText("Pedido enviado");
  expect(await page.evaluate(() => (window as unknown as { __abierto: string }).__abierto)).toContain("https://wa.me/5491155550101?text=Ferrebress");
  expect(psql(`SELECT estado FROM pedido WHERE proveedor_id = '${ID_PROV}'`)).toBe("enviado");
  expect(psql(`SELECT whatsapp FROM proveedor WHERE id = '${ID_PROV}'`)).toBe("5491155550101");
  expect(psql(`SELECT count(*) FROM item_pedido WHERE costo_estimado IS NOT NULL AND pedido_id IN (SELECT id FROM pedido WHERE proveedor_id = '${ID_PROV}')`)).toBe("2");

  // Llegó la mercadería: el ingreso viene con el proveedor y los renglones del pedido. Llegan 6 de las 10 mechas.
  const enLista = page.getByTestId("por-llegar").getByTestId("pedido").filter({ hasText: PROVEEDOR });
  await expect(enLista).toContainText("Enviado");
  await enLista.getByTestId("llego-la-mercaderia").click();
  await expect(page.getByTestId("ingreso-de-pedido")).toContainText(PROVEEDOR);
  await expect(page.getByTestId("renglon")).toHaveCount(2);
  const llego = page.getByTestId("renglon").filter({ hasText: "MECHA PEDIDOS" });
  await expect(llego.getByTestId("cantidad")).toHaveValue("10");
  await llego.getByTestId("cantidad").fill("6");
  await page.getByTestId("archivo-comprobante").setInputFiles({ name: "factura.png", mimeType: "image/png", buffer: FOTO });
  await expect(page.getByTestId("foto-comprobante")).toContainText("cargada");
  await (CELULAR ? page.getByTestId("registrar") : page.getByRole("button", { name: "Registrar ingreso" })).click();
  await expect(page.getByTestId("exito")).toContainText("Ingreso registrado");
  await page.getByTestId("cerrar-exito").click();
  expect(psql(`SELECT estado FROM pedido WHERE proveedor_id = '${ID_PROV}'`)).toBe("recibido_parcial");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("6.000");

  // El pedido dice qué falta; el resto no va a llegar: se cierra incompleto.
  await page.goto(`/#/${RUTA}`);
  const parcial = page.getByTestId("por-llegar").getByTestId("pedido").filter({ hasText: PROVEEDOR });
  await expect(parcial).toContainText("Recibido parcial");
  await expect(parcial.getByTestId("llego-la-mercaderia")).toHaveText("Llegó el resto");
  await parcial.getByRole("button", { name: /Abrir el pedido/ }).click();
  await expect(page.getByTestId("renglon-pedido").filter({ hasText: "MECHA PEDIDOS" })).toContainText("Falta 4");
  await expect(page.getByTestId("renglon-pedido").filter({ hasText: "DISCO PEDIDOS" })).not.toContainText("Falta");
  await page.getByTestId("cerrar-pedido").click();
  await expect(page.getByTestId("mensaje-pedidos")).toContainText("cerrado incompleto");
  await expect(page.getByTestId("cerrados").getByTestId("pedido").filter({ hasText: PROVEEDOR })).toContainText("Cerrado incompleto");
  expect(psql(`SELECT estado FROM pedido WHERE proveedor_id = '${ID_PROV}'`)).toBe("cerrado_incompleto");
  expect(psql(`SELECT string_agg(tipo, ',' ORDER BY creado_en) FROM evento WHERE tipo LIKE 'pedido.%' AND usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL}')`)).toBe("pedido.enviado,pedido.recibido,pedido.cerrado");
});
