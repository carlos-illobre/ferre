import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { psql } = stack("escritorio");

// Happy path "buscar un producto y registrar una venta" (issue #15): el empleado busca,
// agrega con Enter, cambia la cantidad, elige cómo paga y cobra. La venta queda con el
// stock descontado, aparece en "Ventas de hoy" y se puede anular. Sesión sembrada.
const TOKEN = "token-e2e-vender";
const EMAIL = "e2e-vender@ferre.test";
const PROVEEDOR = "Proveedor vender (e2e)";
const ID_PROV = "00000000-0000-0000-0000-00000000e2e5";
const ID_MECHA = "00000000-0000-0000-0000-00000000e2e6";
const ID_TORNILLO = "00000000-0000-0000-0000-00000000e2e7";

test.beforeAll(() => {
  psql(`DELETE FROM anomalia WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  // La prueba del atajo abre «Vincular el celular», que deja un código pedido por esa sesión: se borra antes que ella.
  psql(`DELETE FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}'))`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  // La corrección de la corrida anterior (019): su plata, la marca en los renglones quitados y ella.
  const suyas = `SELECT id FROM correccion_venta WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`;
  psql(`DELETE FROM movimiento_dinero WHERE correccion_id IN (${suyas}) OR usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`UPDATE item_venta SET quitado_por = NULL WHERE quitado_por IN (${suyas})`);
  psql(`DELETE FROM correccion_venta WHERE id IN (${suyas})`);
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

test("buscar, agregar, cobrar en efectivo, ver la venta del día, corregirla y anularla", async ({ page }) => {
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
  await expect.poll(() => psql(`SELECT count(*) FROM venta v JOIN item_venta i ON i.venta_id = v.id WHERE i.producto_id = '${ID_MECHA}' AND v.estado = 'confirmada'`)).toBe("1");
  await expect.poll(() => psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("7.000");
  // El tornillo no tenía stock: se vendió igual, su stock no bajó de cero y quedó la anomalía.
  await expect.poll(() => psql(`SELECT count(*) FROM movimiento_stock WHERE producto_id = '${ID_TORNILLO}'`)).toBe("0");
  await expect.poll(() => psql(`SELECT count(*) FROM anomalia WHERE producto_id = '${ID_TORNILLO}' AND tipo = 'venta_sin_stock'`)).toBe("1");
  await expect.poll(() => psql(`SELECT margen_aplicado FROM item_venta WHERE producto_id = '${ID_TORNILLO}' ORDER BY creado_en DESC LIMIT 1`)).toBe("300");
  await expect.poll(() => psql(`SELECT unidad FROM producto WHERE id = '${ID_TORNILLO}'`)).toBe("kg");
  await expect.poll(() => psql(`SELECT explicacion->'pasos'->>1 FROM item_venta WHERE producto_id = '${ID_MECHA}' ORDER BY creado_en DESC LIMIT 1`)).toContain("+ 100 % de margen");

  // «Ventas de hoy», al lado de Vender, como la v2 (decisión 135): la venta se elige en la tabla y
  // se ve a la derecha. Se corrige ahí mismo (019): una mecha más, la diferencia se cobra en
  // efectivo y el stock baja. Después se anula, con motivo y comentario, y el stock vuelve.
  await page.getByTestId("pestana-hoy").click();
  const lista = page.getByTestId("ventas-de-hoy-lista");
  const ultima = lista.getByTestId("venta-dia").filter({ hasText: "2 productos" }).first();
  await expect(ultima).toBeVisible();
  await ultima.click();
  const panel = page.getByTestId("venta-elegida");
  await expect(panel.getByTestId("detalle-venta")).toContainText(/mecha vender/i);
  await expect(panel.getByTestId("detalle-venta")).toContainText(/tornillo vender/i);
  await page.keyboard.press("e");
  await panel.getByTestId("renglon-corregido").filter({ hasText: /mecha vender/i }).getByTestId("mas").click();
  await expect(panel.getByTestId("diferencia")).toContainText("+$");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByTestId("mensaje")).toContainText("Corrección guardada");
  await expect(ultima).toContainText("corregida");
  await expect.poll(() => psql(`SELECT count(*) FROM correccion_venta WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`)).toBe("1");
  await expect.poll(() => psql(`SELECT count(*) FROM movimiento_dinero WHERE tipo = 'cobro_diferencia' AND medio_pago = 'efectivo' AND usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`)).toBe("1");
  await expect.poll(() => psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("6.000");
  await panel.getByTestId("anular").click();
  await expect(page.getByTestId("confirmar-anular")).toContainText("−$");
  await page.getByTestId("motivo-anular").selectOption("Se arrepintió");
  await page.getByTestId("comentario-anular").fill("cambió de idea");
  await page.getByTestId("confirmar-anular").click();
  await expect(page.getByTestId("hoja-anular")).toHaveCount(0);
  await expect(lista.getByTestId("venta-dia").filter({ hasText: "anulada" }).first()).toBeVisible();
  await expect.poll(() => psql(`SELECT sum(cantidad) FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`)).toBe("10.000");

  // La anomalía del tornillo se ve en Más > Anomalías.
  await page.getByTestId("menu-mas").click();
  await page.getByTestId("mas-anomalias").click();
  // Anomalías abre en «Para revisar» (014): las anotadas están en la otra pestaña.
  await page.getByTestId("pestana-anomalias").click();
  await expect(page.getByTestId("anomalia").filter({ hasText: "TORNILLO VENDER" }).first()).toContainText("Venta sin stock");

  // "No llevó": la consulta queda registrada.
  await page.getByTestId("menu-vender").click();
  await busqueda.fill("e2e mecha vender");
  await busqueda.press("Enter");
  await page.getByTestId("no-llevo").click();
  await expect(page.getByTestId("mensaje")).toContainText("Anotado como «No llevó»");
  await expect.poll(() => psql(`SELECT count(*) FROM consulta WHERE producto_id = '${ID_MECHA}'`)).toBe("1");
});

// Dos focos (decisión 82): mientras la búsqueda espera al servidor, el foco no se mueve solo: si la
// persona ya recorre el menú con las flechas, ahí sigue (specs/018: el catálogo ya no se baja).
test("sin mouse: lo que llega del servidor no le saca el foco al menú", async ({ page }) => {
  let soltar = () => {};
  const suelto = new Promise<void>((listo) => { soltar = listo; });
  await page.route((url) => url.pathname.startsWith("/productos/pagina"), async (r) => { await suelto; await r.continue(); }, { times: 1 });
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/vender");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  await busqueda.fill("e2e mecha");
  // Fuera de la caja (dentro, las flechas mueven el cursor: decisión 130), las flechas van al menú.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("menu-vender")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();
  const contesto = page.waitForResponse((r) => r.url().includes("/productos/pagina"));
  soltar();
  await contesto;
  await page.waitForTimeout(300);
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();
});

// El menú se achica a solo íconos con su botón o Ctrl+B y recuerda cómo quedó (decisión 122);
// achicado, sigue andando con el teclado (decisión 121).
test("el menú se achica con su botón o con Ctrl+B, recuerda cómo quedó y sigue andando con el teclado", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/vender");
  const app = page.locator(".app");
  await expect(page.getByTestId("menu-vender")).toContainText("Vender");
  await page.getByTestId("plegar-menu").click();
  await expect(app).toHaveClass(/plegado/);
  await expect(page.getByTestId("menu-vender")).toHaveAccessibleName("Vender");
  await expect(page.getByTestId("menu-vender").locator(".txt")).toBeHidden();
  await page.reload();
  await expect(app).toHaveClass(/plegado/);
  await page.keyboard.press("Alt+1");
  await expect(page).toHaveURL(/#\/productos/);
  await page.keyboard.press("Control+b");
  await expect(app).not.toHaveClass(/plegado/);
  await expect(page.getByTestId("menu-catalogo")).toContainText("Catálogo");
});

// Todo con el teclado (decisión 61, RNF-05): el menú, las pestañas y una venta completa, sin mouse.
test("sin mouse: recorrer el menú y las pestañas con las flechas, y cobrar una venta con Tab y los atajos", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion", token), TOKEN);
  await page.goto("/#/productos");
  const busqueda = page.getByTestId("busqueda");
  await expect(busqueda).toBeFocused();
  const fila = () => page.evaluate(() => [...document.querySelectorAll("[data-testid=producto]")].findIndex((f) => f.getAttribute("aria-selected") === "true"));
  const elegida = await fila();

  // En Catálogo, ↑ desde la primera fila devuelve la marca de las flechas a la pestaña.
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  // Una lista que solo muestra datos no se recorre: en Listas, ↓ deja la marca en la pestaña.
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pestana-listas")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("pestana-listas")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("[data-flecha]")).toHaveCount(0);
  await expect(page.getByTestId("pestana-listas")).toBeFocused();
  // Un clic en una pestaña la abre y deja la marca en ella, aunque la pantalla nueva tenga una búsqueda.
  await page.getByTestId("pestana-productos").click();
  await expect(page.getByTestId("pestana-productos")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  // Enter en el menú abre la parte y deja la marca en su primera pestaña.
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("menu-deposito")).toBeFocused();
  // El stock se retiene hasta que la marca vuelve al menú: la búsqueda de Inventario aparece
  // tarde, como con internet lento, y no le saca el foco al menú (decisión 82).
  let soltarElStock = () => {};
  const stockSuelto = new Promise<void>((listo) => { soltarElStock = listo; });
  await page.route("**/stock", async (r) => { await stockSuelto; await r.continue(); }, { times: 1 });
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pestana-stock")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("pestana-stock")).toBeFocused();
  // En Más, Enter deja la marca en la primera opción, y se ve su borde.
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  soltarElStock();
  await expect(page.getByTestId("pantalla-stock").getByTestId("busqueda")).toBeVisible();
  await expect(page.getByTestId("menu-mas")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("mas-resumen")).toBeFocused();
  expect(await page.getByTestId("mas-resumen").evaluate((b) => getComputedStyle(b).outlineStyle)).toBe("solid");
  // Y de vuelta a Catálogo, para seguir desde donde estaba.
  await page.keyboard.press("ArrowLeft");
  for (const _ of [1, 2, 3]) await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  await page.keyboard.press("ArrowDown");

  // Con el cursor en la búsqueda, ← es de la búsqueda: no lo saca de ahí (decisión 133). Al menú se
  // llega desde la pestaña (Mayúsculas+Tab hasta ella y ←); ahí ↑ ↓ lo recorren sin mover la lista de
  // productos, hasta Vincular, la cuenta (con «Cerrar sesión» adentro) y el botón que achica el menú.
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".cuerpo input[type='search'], .cuerpo input[type='text']").first()).toBeFocused();
  await hastaElMenu(page);
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();
  for (const destino of ["menu-vender", "menu-deposito", "menu-mas", "emparejar-celular", "cuenta", "plegar-menu", "menu-catalogo"]) {
    await page.keyboard.press("ArrowDown");
    await expect(page.getByTestId(destino)).toBeFocused();
  }
  expect(await fila()).toBe(elegida);

  // → entra a las pestañas; ← → pasan el foco de una a otra; ← desde la primera vuelve al menú.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  // Las flechas solo pasan el foco: la pestaña se abre con Enter, igual que el menú.
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pestana-listas")).toBeFocused();
  await expect(page.getByTestId("pestana-productos")).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pestana-listas")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("pestana-listas")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  await expect(page.getByTestId("pestana-listas")).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("pestana-productos")).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("pestana-productos")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();

  // En Más, las opciones se recorren como la grilla que se ve (pedido de Carlos del 2026-10-15):
  // → y ← a la siguiente y a la anterior, ↓ y ↑ a la de abajo y a la de arriba; ← desde la primera vuelve al menú.
  for (const _ of [1, 2, 3]) await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("menu-mas")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("mas-resumen")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("mas-usuarios")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByTestId("mas-tickets")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("mas-procesos")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("mas-resumen")).toBeFocused();
  await expect(page.getByTestId("mas")).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("menu-mas")).toBeFocused();
  // Dos focos (decisión 82): en Inventario, ↓ desde la pestaña marca la primera fila entera y el
  // cursor de escritura queda en la búsqueda; ↑ ↓ mueven la marca; ↑ desde la primera la saca de la lista.
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("menu-deposito")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("pestana-stock")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const filasDeStock = page.getByTestId("fila-stock");
  await expect(filasDeStock.nth(0)).toHaveAttribute("data-flecha", "");
  await expect(page.locator(".cuerpo input[type='search'], .cuerpo input[type='text']").first()).toBeFocused();
  // La marca es una sola y es la fila entera. Si hay más filas, ↓ pasa a la siguiente y ↑ vuelve.
  await expect(page.locator("[data-flecha]")).toHaveCount(1);
  if ((await filasDeStock.count()) > 1) {
    await page.keyboard.press("ArrowDown");
    await expect(filasDeStock.nth(1)).toHaveAttribute("data-flecha", "");
    await expect(page.locator("[data-flecha]")).toHaveCount(1);
    await page.keyboard.press("ArrowUp");
    await expect(filasDeStock.nth(0)).toHaveAttribute("data-flecha", "");
  }
  // ↑ desde la primera saca la marca de la lista; el cursor sigue en la búsqueda (son dos focos distintos).
  await page.keyboard.press("ArrowUp");
  await expect(page.locator("[data-flecha]")).toHaveCount(0);
  await expect(page.locator(".cuerpo input[type='search'], .cuerpo input[type='text']").first()).toBeFocused();
  await hastaElMenu(page);
  await expect(page.getByTestId("menu-deposito")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("menu-vender")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("menu-catalogo")).toBeFocused();

  // Al entrar a Vender, se llegue como se llegue, el cursor queda en la búsqueda (Carlos, 2026-10-20;
  // decisión 127): la venta entera, con el teclado.
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("busqueda")).toBeFocused();
  await page.keyboard.type("e2e mecha vender");
  await expect(page.getByTestId("sugerencias")).toContainText("MECHA VENDER", { ignoreCase: true }); // el nombre, como frase (decisión 127)
  await page.keyboard.press("Enter");
  const mecha = page.getByTestId("item").filter({ hasText: "MECHA VENDER 8 MM" });
  await expect(mecha).toBeVisible();
  // Desde la búsqueda, ↓ marca la fila del producto, entera, y el cursor sigue en la búsqueda (decisión 82).
  await page.keyboard.press("ArrowDown");
  await expect(page.locator('[data-testid="venta"] [data-flecha]')).toHaveCount(1);
  await expect(page.getByTestId("busqueda")).toBeFocused();
  // Dos focos (decisión 137): con el cursor en la búsqueda vacía, ← lleva la marca al menú y ↑ ↓ lo
  // recorren sin sacar el cursor de la búsqueda; Esc la devuelve a la pantalla.
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByTestId("menu-vender")).toHaveAttribute("data-marca", "");
  await page.keyboard.press("ArrowUp");
  await expect(page.getByTestId("menu-catalogo")).toHaveAttribute("data-marca", "");
  await expect(page.getByTestId("busqueda")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-marca]")).toHaveCount(0);
  await page.keyboard.press("ArrowDown");
  // ↑ desde el primer renglón saca la marca y el cursor no se va de la búsqueda (Carlos, 2026-10-20).
  await page.keyboard.press("ArrowUp");
  await expect(page.locator('[data-testid="venta"] [data-flecha]')).toHaveCount(0);
  await expect(page.getByTestId("busqueda")).toBeFocused();
  // A la cantidad se llega con Tab; ahí ↑ suma, como en cualquier campo de cantidad. F2 cobra.
  const conElFoco = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.testid ?? "");
  for (let i = 0; i < 40 && (await conElFoco()) !== "cantidad"; i++) await page.keyboard.press("Tab");
  await expect(mecha.getByTestId("cantidad")).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(mecha.getByTestId("cantidad")).toHaveValue("2");
  await page.keyboard.press("F2");
  await expect(page.getByTestId("exito")).toContainText("Venta registrada");
  await expect(page.getByTestId("exito")).toContainText("$6.000"); // 2 × $3.000
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("exito")).toHaveCount(0);
  // Todos los botones tienen atajo (decisión 80): con Alt apretado cada uno muestra su letra, y esa
  // letra lo acciona. Los que ya tienen su tecla (Cobrar con F2, el menú con Alt + número) no llevan letra.
  await page.keyboard.down("Alt");
  await expect(page.locator('.atajo-letra[data-de="menu-vender"]')).toHaveCount(0);
  const letra = await page.locator('.atajo-letra[data-de="emparejar-celular"]').textContent();
  expect(letra).toMatch(/^[A-Z]$/);
  expect(["D", "E", "F"]).not.toContain(letra);
  await page.keyboard.press(`Key${letra}`);
  await page.keyboard.up("Alt");
  await expect(page.locator(".atajo-letra")).toHaveCount(0);
  await expect(page.getByTestId("qr-vincular")).toBeVisible();
});

// Desde la caja de texto, al menú sin el mouse: Mayúsculas+Tab hasta las pestañas y ← hasta salir de
// ellas (las flechas no sacan el cursor de la caja, decisión 133).
async function hastaElMenu(page: import("@playwright/test").Page) {
  const dentro = (sel: string) => page.evaluate((s) => (document.activeElement as HTMLElement | null)?.closest(s) !== null, sel);
  for (let i = 0; i < 15 && !(await dentro(".pestanas")); i++) await page.keyboard.press("Shift+Tab");
  for (let i = 0; i < 6 && !(await dentro(".lateral")); i++) await page.keyboard.press("ArrowLeft");
}
