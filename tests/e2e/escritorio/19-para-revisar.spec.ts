import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { API, psql } = stack("escritorio");

const CELULAR = false;

// Lo apartado de alguien a quien desactivaron (specs/014-cambios-apartados, ADR-021): el
// dispositivo de Ana sube con el token de su sesión cerrada una venta que hizo sin conexión, y
// quien administra la acepta desde Más → Anomalías → Para revisar. Queda a nombre de Ana, con la
// fecha en que la cobró.
const TOKEN_ADMIN = "token-e2e-apartados-admin";
const TOKEN_ANA = "token-e2e-apartados-ana";
const EMAIL_ADMIN = "e2e-apartados-admin@ferre.test";
const EMAIL_ANA = "e2e-apartados-ana@ferre.test";
const VENTA = "00000000-0000-0000-0000-00000000a9a1";
const CANDADO = "00000000-0000-0000-0000-00000000a9a2";
const COBRADA = "2026-10-01T13:47:00.000Z";
// Los roles con los que arranca el sistema tienen id fijo (migración 0015).
const VENDEDOR = "00000000-0000-4000-8000-0000000000a1";
const ADMINISTRADOR = "00000000-0000-4000-8000-0000000000a4";
// El Gerente ve las anomalías: con los dos roles, Anomalías tiene sus dos pestañas.
const GERENTE = "00000000-0000-4000-8000-0000000000a5";
const MAS = "mas";
const PARA_REVISAR = CELULAR ? "#/mas/para-revisar" : "#/para-revisar";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

test.beforeAll(() => {
  const deEllos = `(SELECT id FROM usuario WHERE email IN ('${EMAIL_ADMIN}', '${EMAIL_ANA}'))`;
  psql(`DELETE FROM cambio_apartado WHERE usuario_id IN ${deEllos}`);
  psql(`DELETE FROM item_venta WHERE venta_id = '${VENTA}' OR producto_id = '${CANDADO}'`);
  psql(`DELETE FROM venta WHERE id = '${VENTA}'`);
  psql(`DELETE FROM anomalia WHERE producto_id = '${CANDADO}'`);
  psql(`DELETE FROM movimiento_stock WHERE producto_id = '${CANDADO}'`);
  psql(`DELETE FROM producto WHERE id = '${CANDADO}'`);
  // Un candado con 10 en stock: la venta aceptada lo tiene que bajar.
  psql(`INSERT INTO producto (id, descripcion, marca, margen_elegido) VALUES ('${CANDADO}', 'CANDADO APARTADO (E2E)', 'MARCA E2E', 100)`);
  psql(`INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, fecha, nota) VALUES (gen_random_uuid(), '${CANDADO}', 'ajuste', 10, 'conteo', now(), 'stock inicial e2e')`);
  psql(`DELETE FROM sesion WHERE usuario_id IN ${deEllos}`);
  psql(`DELETE FROM evento WHERE usuario_id IN ${deEllos}`);
  psql(`DELETE FROM usuario_rol WHERE usuario_id IN ${deEllos}`);
  psql(`DELETE FROM usuario WHERE email IN ('${EMAIL_ADMIN}', '${EMAIL_ANA}')`);
  psql(`INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), '${EMAIL_ADMIN}', 'Admin apartados E2E'), (gen_random_uuid(), '${EMAIL_ANA}', 'Ana apartados E2E')`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u, rol r WHERE u.email = '${EMAIL_ADMIN}' AND r.id IN ('${ADMINISTRADOR}', '${GERENTE}')`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT id, '${VENDEDOR}' FROM usuario WHERE email = '${EMAIL_ANA}'`);
  for (const [token, email] of [[TOKEN_ADMIN, EMAIL_ADMIN], [TOKEN_ANA, EMAIL_ANA]]) {
    psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash(token!)}', 'celular de Ana', now() + interval '1 day' FROM usuario WHERE email = '${email}'`);
  }
});

// Se borra lo de la prueba al terminar, para no dejar datos sueltos.
test.afterAll(() => {
  psql(`DELETE FROM item_venta WHERE venta_id = '${VENTA}'`);
  psql(`DELETE FROM venta WHERE id = '${VENTA}'`);
  psql(`DELETE FROM movimiento_stock WHERE producto_id = '${CANDADO}'`);
  psql(`DELETE FROM producto WHERE id = '${CANDADO}'`);
});

async function entrarComo(page: Page, token: string, ruta: string) {
  await page.goto("/");
  await page.evaluate((t) => localStorage.setItem("ferre.sesion.desarrollo", t), token);
  await page.goto(`/#/${ruta}`);
  await page.reload();
}

test("014-E01 014-E06 014-E14 una venta sin mandar de Ana, desactivada, sube apartada y se acepta a su nombre, con la fecha en que la cobró", async ({ page }) => {
  const ana = psql(`SELECT id FROM usuario WHERE email = '${EMAIL_ANA}'`);
  // Quien administra desactiva a Ana: su sesión se cierra (007).
  const desactivar = await page.request.patch(`${API}/usuarios/${ana}`, { headers: { Authorization: `Bearer ${TOKEN_ADMIN}` }, data: { activo: false } });
  expect(desactivar.ok()).toBe(true);
  // Con la sesión cerrada, Ana no puede registrar nada (014-E14)…
  const directo = await page.request.post(`${API}/ventas`, { headers: { Authorization: `Bearer ${TOKEN_ANA}` }, data: { id: VENTA, medio_pago: "efectivo", items: [{ descripcion: "x", cantidad: 1, precio_unitario: 1000 }] } });
  expect(directo.status()).toBe(401);
  // …pero su dispositivo sube lo que tenía sin mandar, que queda apartado (014-E01).
  const venta = { id: VENTA, medio_pago: "efectivo", fecha: COBRADA, items: [{ producto_id: CANDADO, descripcion: "Candado apartado (E2E)", cantidad: 2, precio_unitario: 11000 }] };
  const subida = await page.request.post(`${API}/apartados`, { headers: { Authorization: `Bearer ${TOKEN_ANA}` }, data: { cambios: [{ orden: 1, creado_en: COBRADA, tipo: "venta", metodo: "POST", ruta: "/ventas", cuerpo: venta }] } });
  expect(subida.status()).toBe(200);
  expect(psql(`SELECT count(*) FROM venta WHERE id = '${VENTA}'`)).toBe("0");

  // Quien administra lo ve en Más → Anomalías, que abre en «Para revisar», con la cantidad.
  await entrarComo(page, TOKEN_ADMIN, MAS);
  await page.getByTestId("mas-anomalias").click();
  await expect(page).toHaveURL(new RegExp(`${PARA_REVISAR}$`));
  await expect(page.getByTestId("cuenta-para-revisar")).toHaveText("1");
  // Primero «Para revisar», después «Anotadas».
  const pestanas = CELULAR ? page.getByRole("tab") : page.locator(".pestanas button");
  await expect(pestanas).toHaveText(["Para revisar1", "Anotadas"]);
  const tarjeta = page.getByRole("region", { name: "Ana apartados E2E" }).getByTestId("apartado");
  // Como la v2 (021): en la bandeja, qué es, el medio y el importe; el detalle, en el celular en la
  // misma tarjeta y en la computadora al lado.
  await expect(tarjeta).toContainText(/Venta · .*Efectivo/);
  await expect(tarjeta).toContainText("$22.000");
  const detalle = CELULAR ? tarjeta : page.getByTestId("cambio-elegido");
  await expect(detalle).toContainText("Candado apartado (E2E)");
  await expect(detalle).toContainText("2 un.");
  await detalle.getByTestId("aceptar-apartado").click();
  await expect(page.getByTestId("nada-para-revisar")).toBeVisible();

  // Quedó registrada a nombre de Ana, con la fecha en que la cobró, y se anotó quién la aceptó.
  await expect.poll(() => psql(`SELECT to_char(fecha AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') FROM venta WHERE id = '${VENTA}'`)).toBe("2026-10-01 13:47");
  expect(psql(`SELECT count(*) FROM evento WHERE tipo = 'venta.registrada' AND usuario_id = '${ana}' AND contenido->>'id' = '${VENTA}'`)).toBe("1");
  expect(psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${CANDADO}'`)).toBe("8.000");
  expect(psql(`SELECT count(*) FROM evento WHERE tipo = 'apartado.aceptado' AND usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL_ADMIN}')`)).toBe("1");
});
