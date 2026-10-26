import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";
import { cerrarLasOtrasVentanas, otraVentana } from "../comun/ventanas";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { psql, psqlAcceso } = stack("celular");

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

test.beforeAll(() => {
  psqlAcceso(`DELETE FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')) OR celular_sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}'))`);
  psqlAcceso(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psqlAcceso(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psqlAcceso(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Mostrador escáner E2E', 'mostrador')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psqlAcceso(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  for (const t of [TOKEN_LAPTOP, TOKEN_CELULAR]) {
    const hash = createHash("sha256").update(t).digest("hex");
    psqlAcceso(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e ${t}', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
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

test.afterEach(cerrarLasOtrasVentanas);

test("023-E15 025-E02: vincular el celular (sin preguntar si ya lo leyó) y que lo escaneado aparezca en la laptop", async ({ browser }) => {
  const laptop = await otraVentana(browser, { viewport: { width: 1366, height: 768 } });
  await laptop.addInitScript((t) => localStorage.setItem("ferre.sesion.desarrollo", t), TOKEN_LAPTOP);
  await laptop.goto("/#/vender");
  await expect(laptop.getByTestId("busqueda")).toBeEnabled();
  // Mientras muestra el código, la laptop espera por su canal: no pregunta si el celular ya lo leyó.
  const pedidosDeLaLaptop: string[] = [];
  laptop.on("request", (r) => pedidosDeLaLaptop.push(`${r.method()} ${new URL(r.url()).pathname}`));
  await laptop.getByTestId("emparejar-celular").click();
  // El código tarda un instante en llegar: se espera la imagen, no el recuadro vacío.
  await expect(laptop.getByTestId("qr-vincular").locator("img")).toBeVisible();
  const enlace = await laptop.evaluate(() => (window as unknown as { __enlaceVinculacion: string }).__enlaceVinculacion);
  expect(enlace).toContain("#/vincular-celular?codigo=");

  // El celular abre el enlace del QR (hayCamara() es falso en el navegador de prueba: se tipea el código).
  const celular = await otraVentana(browser, { viewport: { width: 390, height: 844 } });
  await celular.addInitScript((t) => localStorage.setItem("ferre.sesion.desarrollo", t), TOKEN_CELULAR);
  await celular.goto(enlace.replace(/^https?:\/\/[^/]+/, ""));
  await expect(celular.getByTestId("vinculacion-ok")).toContainText("quedó vinculado");
  await expect(laptop.getByTestId("celular-vinculado")).toBeVisible({ timeout: 10000 });
  expect(pedidosDeLaLaptop.filter((p) => /^GET \/puestos\/[0-9a-f-]{36}$/.test(p))).toEqual([]);

  // El celular, como lector de la computadora (decisión 59), manda un código conocido: la laptop
  // lo agrega a la venta. Viaja por la conexión directa entre los dos (specs/023).
  await expect(laptop.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "directa", { timeout: 15000 });
  await celular.goto("/#/lector");
  // En el navegador de prueba no hay cámara: el código se tipea en el escáner, como la alternativa de la regla.
  const mandar = async (codigo: string) => {
    if (await celular.getByTestId("leer-otro").isVisible()) await celular.getByTestId("leer-otro").click();
    const escaner = celular.getByTestId("escaner");
    await escaner.getByTestId("codigo-manual").fill(codigo);
    await escaner.getByTestId("codigo-manual").press("Enter");
    await expect(celular.getByTestId("lector-resultado")).toHaveText("Ya está en la computadora", { timeout: 10000 });
  };
  await mandar("7790001112223");
  await expect(laptop.getByTestId("item").filter({ hasText: "CINTA ESCANER" })).toBeVisible({ timeout: 10000 });

  // Un código desconocido: la laptop pide asociarlo; se busca el producto, Enter, y queda asociado.
  await mandar("7790009998887");
  await expect(laptop.getByTestId("codigo-desconocido")).toContainText("7790009998887", { timeout: 10000 });
  await laptop.getByTestId("busqueda").fill("e2e guantes escaner");
  await laptop.getByTestId("busqueda").press("Enter");
  await expect(laptop.getByTestId("item").filter({ hasText: "GUANTES ESCANER" })).toBeVisible();
  await expect.poll(() => psql(`SELECT codigo_barras FROM producto WHERE id = '${ID_PROD2}'`)).toBe("7790009998887");

  // La segunda vez, el mismo código entra directo (cantidad 2).
  await mandar("7790009998887");
  await expect(laptop.getByTestId("item").filter({ hasText: "GUANTES ESCANER" }).getByTestId("cantidad")).toHaveValue("2", { timeout: 10000 });
  // Se cierran los dos: si quedaran abiertos y emparejados, la prueba que sigue (con la misma
  // sesión de computadora) entraría en espejo con este celular y se iría a su pantalla.
  await laptop.context().close();
  await celular.context().close();
});

// El código de barras se le carga a un producto desde su ficha (RF-08) y después sirve para
// buscarlo. En el navegador de prueba la cámara no abre: se tipea, que es la alternativa de la regla.
test("cargarle el código de barras a un producto desde su ficha y encontrarlo por ese código", async ({ page }) => {
  psql(`UPDATE producto SET codigo_barras = NULL WHERE codigo_barras = '7790009998881'`);
  await page.addInitScript((t) => localStorage.setItem("ferre.sesion.desarrollo", t), TOKEN_LAPTOP);
  await page.goto("/#/catalogo");
  await page.getByTestId("busqueda").fill("GUANTES ESCANER");
  await page.getByTestId("producto").filter({ hasText: "GUANTES ESCANER" }).click();
  const ficha = page.getByTestId("ficha-producto");
  await ficha.getByTestId("escanear-codigo").click();
  // Se abre el escáner; como la cámara del navegador de prueba no existe, se tipea ahí mismo.
  const escaner = page.getByTestId("escaner");
  await escaner.getByTestId("codigo-manual").fill("7790009998881");
  await escaner.getByTestId("codigo-manual").press("Enter");
  await expect(escaner).toHaveCount(0);
  await expect(ficha.getByTestId("codigo-actual")).toHaveText("7790009998881");
  await expect(ficha.getByTestId("codigo-guardado")).toContainText("Código actualizado");
  // Por nombre y no por id: la corrida del otro tamaño de pantalla deja un producto que se llama igual.
  await expect.poll(() => psql(`SELECT count(*) FROM producto WHERE codigo_barras = '7790009998881' AND descripcion LIKE 'GUANTES ESCANER%'`)).toBe("1");
  // 016-E09: con la hora de la lectura guardada en el servidor, de hace un momento.
  await expect.poll(() => psql(`SELECT count(*) FROM producto WHERE codigo_barras = '7790009998881' AND descripcion LIKE 'GUANTES ESCANER%' AND codigo_leido_en > now() - interval '5 minutes'`)).toBe("1");

  await ficha.getByRole("button", { name: "Listo" }).click();
  await page.getByTestId("busqueda").fill("7790009998881");
  await expect(page.getByTestId("producto")).toHaveCount(1);
  await expect(page.getByTestId("producto")).toContainText("GUANTES ESCANER");
});
