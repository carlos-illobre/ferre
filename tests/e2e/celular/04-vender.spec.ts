import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";
import { deslizarParaCobrar, buscarEnVender } from "../comun/cobrar";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { API, psql, psqlAuditoria } = stack("celular");

// Happy path "buscar un producto y registrar una venta" (issue #15): el empleado busca,
// agrega con Enter, cambia la cantidad, elige cómo paga y cobra. La venta queda con el
// stock descontado, aparece en "Ventas del día" y se puede anular. Sesión sembrada.
const TOKEN = "token-e2e-vender";
const EMAIL = "e2e-vender@ferre.test";
const PROVEEDOR = "Proveedor vender (e2e)";
const ID_PROV = "00000000-0000-0000-0000-00000000e2e5";
const ID_MECHA = "00000000-0000-0000-0000-00000000e2e6";
const ID_TORNILLO = "00000000-0000-0000-0000-00000000e2e7";

test.beforeAll(() => {
  // Los cambios de una corrida anterior (019): su plata, sus renglones y ellos, antes que los renglones de la venta.
  psql(`WITH c AS (SELECT DISTINCT cambio_id FROM cambio_renglon WHERE producto_id IN ('${ID_MECHA}', '${ID_TORNILLO}')), m AS (DELETE FROM movimiento_dinero WHERE cambio_id IN (SELECT cambio_id FROM c)), r AS (DELETE FROM cambio_renglon WHERE cambio_id IN (SELECT cambio_id FROM c)) DELETE FROM cambio WHERE id IN (SELECT cambio_id FROM c)`);
  psql(`DELETE FROM anomalia WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  // La prueba del atajo abre «Vincular el celular», que deja un código pedido por esa sesión: se borra antes que ella.
  psql(`DELETE FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}'))`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
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
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await page.goto("/#/vender");
  await expect(page.getByTestId("abrir-busqueda")).toBeVisible();
  // En el celular la búsqueda no se abre sola: es una hoja que se abre al tocar la caja (decisión 140).
  await expect(page.getByTestId("hoja-buscar")).toHaveCount(0);

  // Producto con margen guardado: Enter lo agrega ya con precio (1000 × 2 × 1,21 = 2420 → $3.000).
  const busqueda = await buscarEnVender(page, "e2e mecha vender");
  await expect(page.getByTestId("sugerencias")).toContainText("$3.000");
  await busqueda.press("Enter");
  const mecha = page.getByTestId("item").filter({ hasText: "MECHA VENDER 8 MM" });
  await expect(mecha).toBeVisible();
  await expect(page.getByTestId("hoja-buscar")).toHaveCount(0);
  await expect(page.getByTestId("total")).toContainText("$3.000");

  // Cantidad 3; la flechita suma de a 1 (enteras, sin decimales); 2,7 por unidad es 2.
  await mecha.getByTestId("cantidad").fill("3");
  await expect(page.getByTestId("total")).toContainText("$9.000");
  await mecha.getByRole("button", { name: "Uno más", exact: true }).click(); // el contador es el mismo que en la computadora
  await expect(mecha.getByTestId("cantidad")).toHaveValue("4");
  await mecha.getByTestId("cantidad").fill("2.7");
  await expect(mecha.getByTestId("cantidad")).toHaveValue("2");
  await mecha.getByTestId("cantidad").fill("3");
  await expect(page.getByTestId("total")).toContainText("$9.000");

  // Producto sin margen: queda en rojo hasta elegirlo en la fila; cualquier margen sobre $10 redondea a $1.000.
  await (await buscarEnVender(page, "e2e tornillo vender")).press("Enter");
  const tornillo = page.getByTestId("item").filter({ hasText: "TORNILLO VENDER" });
  await expect(tornillo).toContainText("Sin precio");
  await deslizarParaCobrar(page);
  await expect(page.getByRole("alert")).toContainText("sin precio");
  await tornillo.getByRole("button", { name: "300 %", exact: true }).click(); // 10 × 4 × 1,21 = 48,4 → $1.000
  await expect(tornillo).toContainText("$1.000");
  await expect(page.getByTestId("total")).toContainText("$10.000");
  // Por kilo: admite un decimal (1,5 kg) y queda guardado en el producto. 1,5 kg × $1.000 =
  // $1.500: el renglón se redondea para arriba a $2.000 para no dar vuelto (RF-19).
  // La unidad está adentro de la cantidad y se toca para cambiarla (decisión 140).
  await tornillo.getByTestId("unidad").selectOption("kg");
  await expect(tornillo.getByTestId("unidad-renglon")).toHaveText("kg");
  await tornillo.getByTestId("cantidad").fill("1.5");
  await expect(page.getByTestId("total")).toContainText("$11.000");

  // Efectivo viene elegido (decisión 37); se cobra deslizando el botón de la v2, que dice el total (decisiones 119 y 140).
  await expect(page.getByTestId("medio")).toHaveText("Efectivo");
  await expect(page.getByTestId("cobrar")).toHaveText("Deslizá para cobrar$11.000");
  await deslizarParaCobrar(page);
  // La venta registrada, con el importe grande; «Seguir vendiendo» vuelve a la búsqueda vacía.
  await expect(page.getByTestId("exito")).toContainText("Venta registrada");
  await expect(page.getByTestId("exito")).toContainText("$11.000");
  await expect(page.getByTestId("exito")).toContainText("Efectivo");
  await page.getByTestId("cerrar-exito").click();
  await expect(page.getByTestId("exito")).toHaveCount(0);
  await expect(page.getByTestId("item")).toHaveCount(0);

  // Quedó en la base con el stock descontado y el precio explicado.
  await expect.poll(() => psql(`SELECT count(*) FROM venta v JOIN item_venta i ON i.venta_id = v.id WHERE i.producto_id = '${ID_MECHA}' AND v.estado = 'confirmada'`)).toBe("1");
  await expect.poll(() => psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("7.000");
  // El tornillo no tenía stock: se vendió igual, su stock no bajó de cero y quedó la anomalía.
  await expect.poll(() => psql(`SELECT count(*) FROM movimiento_stock WHERE producto_id = '${ID_TORNILLO}'`)).toBe("0");
  await expect.poll(() => psql(`SELECT count(*) FROM anomalia WHERE producto_id = '${ID_TORNILLO}' AND tipo = 'venta_sin_stock'`)).toBe("1");
  await expect.poll(() => psql(`SELECT margen_aplicado FROM item_venta WHERE producto_id = '${ID_TORNILLO}' ORDER BY creado_en DESC LIMIT 1`)).toBe("300");
  await expect.poll(() => psql(`SELECT unidad FROM producto WHERE id = '${ID_TORNILLO}'`)).toBe("kg");
  await expect.poll(() => psql(`SELECT explicacion->'pasos'->>1 FROM item_venta WHERE producto_id = '${ID_MECHA}' ORDER BY creado_en DESC LIMIT 1`)).toContain("+ 100 % de margen");

  // «Ventas del día» muestra las ventas del día y desde ahí se anula (decisión 120).
  await page.getByRole("tab", { name: "Ventas del día" }).click();
  // La más reciente primero (017): la que se acaba de cobrar, en un renglón que abre su hoja.
  const deHoy = page.getByTestId("ventas-de-hoy").getByTestId("venta-dia").first();
  await expect(deHoy).toContainText("2 productos");
  await expect(deHoy).toContainText("Efectivo");
  await expect(deHoy).toContainText("$11.000");
  await deHoy.getByRole("button").click();
  await expect(page.getByTestId("detalle-venta")).toContainText("3 un. MECHA VENDER");
  await expect(page.getByTestId("detalle-venta")).toContainText("1,5 kg TORNILLO VENDER");
  // «Anular» pide confirmar, con el motivo de la lista y un comentario (decisión 110), y devuelve el stock.
  await page.getByTestId("anular").click();
  await page.getByTestId("motivo-anular").selectOption("Se arrepintió");
  await page.getByTestId("comentario-anular").fill("cambió de idea");
  await page.getByTestId("confirmar-anular").click();
  await expect(deHoy).toContainText(/anulada/i);
  await expect.poll(() => psqlAuditoria(`SELECT contenido->>'motivo' FROM auditoria.evento WHERE tipo = 'venta.anulada' ORDER BY fecha DESC LIMIT 1`)).toBe("Se arrepintió: cambió de idea");
  await expect.poll(() => psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("10.000");
  // La anomalía se ve en Más > Anomalías.
  await page.getByRole("button", { name: "Más", exact: true }).click();
  await page.getByRole("button", { name: /Anomalías/ }).click();
  // Anomalías abre en «Para revisar» (014): las anotadas están en la otra pestaña.
  await page.getByRole("tab", { name: "Anotadas" }).click();
  // Como la v2: arriba el resumen de la semana; el registro entero se abre aparte.
  await expect(page.getByTestId("producto-con-anomalias").filter({ hasText: /TORNILLO VENDER/i })).toBeVisible();
  await page.getByTestId("ver-registro").click();
  await expect(page.getByTestId("anomalia").filter({ hasText: /TORNILLO VENDER/i }).first()).toContainText("Venta sin stock");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Vender" }).click();

  // "No llevó": la consulta queda registrada.
  await (await buscarEnVender(page, "e2e mecha vender")).press("Enter");
  await page.getByRole("button", { name: "No llevó" }).click();
  await expect(page.getByTestId("mensaje")).toContainText("Anotado como «No llevó»");
  await expect.poll(() => psql(`SELECT count(*) FROM consulta WHERE producto_id = '${ID_MECHA}'`)).toBe("1");
});

// 019-E12 019-E18: una devolución desde «Ventas del día»: se vende una mecha, se abre la venta, «Cambio»,
// vuelve la mecha (no fallada) y no se lleva nada: se devuelve en efectivo y la mecha vuelve al stock.
test("devolver un producto desde la hoja de la venta", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await page.goto("/#/vender");
  const antes = Number(psql(`SELECT COALESCE(sum(cantidad), 0) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`));
  await (await buscarEnVender(page, "e2e mecha vender")).press("Enter");
  await expect(page.getByTestId("item")).toHaveCount(1);
  await deslizarParaCobrar(page);
  await page.getByTestId("cerrar-exito").click();
  await expect.poll(() => Number(psql(`SELECT COALESCE(sum(cantidad), 0) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`))).toBe(antes - 1);

  // 019-E11: la venta aparece al buscar el producto entre las de los últimos 15 días.
  const halladas = await page.request.get(`${API}/ventas/para-cambio?q=${encodeURIComponent("mécha vender")}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  expect(halladas.status()).toBe(200);
  expect(JSON.stringify(await halladas.json())).toContain("MECHA VENDER");

  await page.getByRole("tab", { name: "Ventas del día" }).click();
  await page.getByTestId("ventas-de-hoy").getByTestId("venta-dia").first().getByRole("button").click();
  await page.getByTestId("hoja-venta").getByTestId("cambio").click();
  const cambio = page.getByTestId("hoja-cambio");
  await cambio.getByTestId("marcar-vuelve").first().click();
  await expect(cambio.getByTestId("confirmar-cambio")).toHaveText(/Devolver \$3\.000/);
  await cambio.getByTestId("confirmar-cambio").click();
  await expect(page.getByTestId("mensaje")).toContainText("Devolución registrada");
  await expect.poll(() => psql(`SELECT count(*) FROM cambio_renglon WHERE producto_id = '${ID_MECHA}' AND lado = 'vuelve'`)).toBe("1");
  await expect.poll(() => psql(`SELECT importe FROM movimiento_dinero m JOIN cambio_renglon r ON r.cambio_id = m.cambio_id WHERE r.producto_id = '${ID_MECHA}'`)).toBe("-3000.00");
  await expect.poll(() => Number(psql(`SELECT COALESCE(sum(cantidad), 0) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`))).toBe(antes);

  // 019-E32: la venta con la devolución se anula igual; lo que ya volvió no se suma otra vez al stock.
  const ventaId = psql(`SELECT c.venta_id FROM cambio c JOIN cambio_renglon r ON r.cambio_id = c.id WHERE r.producto_id = '${ID_MECHA}' LIMIT 1`);
  const anulada = await page.request.post(`${API}/ventas/${ventaId}/anular`, { headers: { Authorization: `Bearer ${TOKEN}` }, data: {} });
  expect(anulada.status()).toBeLessThan(300);
  expect(psql(`SELECT estado FROM venta WHERE id = '${ventaId}'`)).toBe("anulada");
  expect(Number(psql(`SELECT COALESCE(sum(cantidad), 0) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`))).toBe(antes);
});
