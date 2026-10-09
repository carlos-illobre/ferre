import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// Celular que escanea, laptop que muestra (issue #52): la laptop muestra el QR, el celular
// lo abre y queda vinculado, y cada código que "escanea" (acá, tipeado en el escáner)
// aparece en la venta de la laptop. Un código desconocido se asocia a un producto y la
// segunda vez entra directo.
const TOKEN_LAPTOP = "token-e2e-laptop";
const TOKEN_CELULAR = "token-e2e-celular";
const EMAIL = "e2e-escaner@ferre.test";
const ID_PROV = "00000000-0000-0000-0000-00000000e2f2";
const ID_PROD = "00000000-0000-0000-0000-00000000e2f3";
const ID_PROD2 = "00000000-0000-0000-0000-00000000e2f4";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  psql(`DELETE FROM codigo_escaneado WHERE puesto_id IN (SELECT id FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')))`);
  psql(`DELETE FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')) OR celular_sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}'))`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador escáner E2E', 'mostrador')`);
  for (const t of [TOKEN_LAPTOP, TOKEN_CELULAR]) {
    const hash = createHash("sha256").update(t).digest("hex");
    psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e ${t}', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  }
  psql(`DELETE FROM movimiento_stock WHERE producto_id IN ('${ID_PROD}', '${ID_PROD2}')`);
  psql(`DELETE FROM item_venta WHERE producto_id IN ('${ID_PROD}', '${ID_PROD2}')`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id IN ('${ID_PROD}', '${ID_PROD2}')`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', 'Proveedor escáner (e2e)')`);
  psql(`INSERT INTO producto (id, descripcion, marca, codigo_barras, margen_elegido) VALUES ('${ID_PROD}', 'CINTA ESCANER 19MM (E2E)', 'MARCA E2E', '7790001112223', 100), ('${ID_PROD2}', 'GUANTES ESCANER TALLE 9 (E2E)', 'MARCA E2E', NULL, 100)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_PROD}', '${ID_PROV}', 'CE19', 1000, '[]', 1000, 0.21, '2026-08-11'), (gen_random_uuid(), '${ID_PROD2}', '${ID_PROV}', 'GE9', 2000, '[]', 2000, 0.21, '2026-08-11')`);
});

test("vincular el celular y que lo escaneado aparezca en la laptop", async ({ browser }) => {
  const laptop = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  await laptop.addInitScript((t) => localStorage.setItem("ferre.sesion", t), TOKEN_LAPTOP);
  await laptop.goto("/#/vender");
  await expect(laptop.getByTestId("busqueda")).toBeEnabled();
  await laptop.getByTestId("vincular-celular").click();
  await expect(laptop.getByTestId("qr-vincular")).toBeVisible();
  const enlace = await laptop.evaluate(() => (window as unknown as { __enlaceVinculacion: string }).__enlaceVinculacion);
  expect(enlace).toContain("#/vincular-celular?codigo=");

  // El celular abre el enlace del QR (hayCamara() es falso en el navegador de prueba: se tipea el código).
  const celular = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  await celular.addInitScript((t) => localStorage.setItem("ferre.sesion", t), TOKEN_CELULAR);
  await celular.goto(enlace.replace(/^https?:\/\/[^/]+/, ""));
  await expect(celular.getByTestId("vinculacion-ok")).toContainText("quedó vinculado");
  await expect(laptop.getByTestId("celular-vinculado")).toBeVisible({ timeout: 10000 });

  // El celular manda un código conocido: la laptop lo agrega a la venta.
  await celular.getByRole("button", { name: "Ir a vender" }).click();
  await expect(celular.getByTestId("busqueda")).toBeEnabled();
  // Se manda el código por la misma API que usa el escáner del celular.
  const puestoRemoto = await celular.evaluate(() => JSON.parse(localStorage.getItem("ferre.puesto-remoto") ?? "null") as { id: string } | null);
  expect(puestoRemoto).not.toBeNull();
  const mandar = (codigo: string) => celular.evaluate(async ([id, codigo, token]) => {
    const r = await fetch(`http://localhost/puestos/${id}/codigos`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ codigo }) });
    return r.status;
  }, [puestoRemoto!.id, codigo, TOKEN_CELULAR] as const);
  expect(await mandar("7790001112223")).toBe(201);
  await expect(laptop.getByTestId("item").filter({ hasText: "CINTA ESCANER" })).toBeVisible({ timeout: 10000 });

  // Un código desconocido: la laptop pide asociarlo; se busca el producto, Enter, y queda asociado.
  expect(await mandar("7790009998887")).toBe(201);
  await expect(laptop.getByTestId("codigo-desconocido")).toContainText("7790009998887", { timeout: 10000 });
  await laptop.getByTestId("busqueda").fill("e2e guantes escaner");
  await laptop.getByTestId("busqueda").press("Enter");
  await expect(laptop.getByTestId("item").filter({ hasText: "GUANTES ESCANER" })).toBeVisible();
  await expect.poll(() => psql(`SELECT codigo_barras FROM producto WHERE id = '${ID_PROD2}'`)).toBe("7790009998887");

  // La segunda vez, el mismo código entra directo (cantidad 2).
  expect(await mandar("7790009998887")).toBe(201);
  await expect(laptop.getByTestId("item").filter({ hasText: "GUANTES ESCANER" }).getByTestId("cantidad")).toHaveValue("2", { timeout: 10000 });
  expect(psql(`SELECT count(*) FROM codigo_escaneado WHERE entregado_en IS NOT NULL AND puesto_id = '${puestoRemoto!.id}'`)).toBe("3");
});
