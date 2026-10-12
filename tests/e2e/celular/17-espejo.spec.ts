import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// El espejo entre el celular y la computadora emparejados (decisión 60): están en la misma
// parte y comparten la venta en curso; «Pausar» los separa un rato; cada emparejamiento es de
// una persona y lo de otra no lo toca.
const TOKEN_COMPU = "token-e2e-espejo-compu";
const TOKEN_CELULAR = "token-e2e-espejo-celular";
const TOKEN_OTRA = "token-e2e-espejo-otra";
const EMAIL = "e2e-espejo@ferre.test";
const EMAIL_OTRA = "e2e-espejo-otra@ferre.test";
const ID_PROV = "00000000-0000-0000-0000-0000000e5e01";
const ID_MECHA = "00000000-0000-0000-0000-0000000e5e02";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

test.beforeAll(() => {
  const deEstos = `(SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email IN ('${EMAIL}', '${EMAIL_OTRA}')))`;
  psql(`DELETE FROM codigo_escaneado WHERE puesto_id IN (SELECT id FROM puesto WHERE sesion_id IN ${deEstos} OR celular_sesion_id IN ${deEstos})`);
  psql(`DELETE FROM puesto WHERE sesion_id IN ${deEstos} OR celular_sesion_id IN ${deEstos}`);
  for (const e of [EMAIL, EMAIL_OTRA]) {
    psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${e}')`);
    psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${e}')`);
    psql(`DELETE FROM usuario WHERE email = '${e}'`);
  }
  psql(`INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), '${EMAIL}', 'Espejo E2E'), (gen_random_uuid(), '${EMAIL_OTRA}', 'Otra persona E2E')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email IN ('${EMAIL}', '${EMAIL_OTRA}')`);
  for (const [token, email] of [[TOKEN_COMPU, EMAIL], [TOKEN_CELULAR, EMAIL], [TOKEN_OTRA, EMAIL_OTRA]]) {
    psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash(token!)}', 'e2e ${token}', now() + interval '1 day' FROM usuario WHERE email = '${email}'`);
  }
  // La computadora y el celular de la misma persona, ya emparejados.
  psql(`INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, vinculado_en, celular_sesion_id, expira_en) SELECT gen_random_uuid(), a.id, 'e2e-espejo', 'computadora e2e', now(), b.id, now() + interval '30 days' FROM sesion a, sesion b WHERE a.token_hash = '${hash(TOKEN_COMPU)}' AND b.token_hash = '${hash(TOKEN_CELULAR)}'`);
  psql(`DELETE FROM item_venta WHERE producto_id = '${ID_MECHA}'`);
  psql(`DELETE FROM movimiento_stock WHERE producto_id = '${ID_MECHA}'`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id = '${ID_MECHA}'`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', 'Proveedor espejo (e2e)')`);
  psql(`INSERT INTO producto (id, descripcion, marca, margen_elegido) VALUES ('${ID_MECHA}', 'MECHA ESPEJO 8 MM (E2E)', 'MARCA E2E', 100)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_MECHA}', '${ID_PROV}', 'ME8', 1000, '[]', 1000, 0.21, '2026-08-01')`);
});

test("emparejados y abiertos los dos, van juntos: la parte, la venta, la pausa y desvincular", async ({ browser }) => {
  const abrir = async (ancho: number, alto: number, token: string, ruta: string) => {
    const pagina = await (await browser.newContext({ viewport: { width: ancho, height: alto } })).newPage();
    await pagina.addInitScript((t) => localStorage.setItem("ferre.sesion", t), token);
    await pagina.goto(ruta);
    return pagina;
  };
  const compu = await abrir(1366, 768, TOKEN_COMPU, "/#/vender");
  await expect(compu.getByTestId("espejo-estado")).toContainText("El celular no está abierto");
  const celular = await abrir(390, 844, TOKEN_CELULAR, "/#/catalogo");
  // Otra persona, con su propia computadora y sin emparejar: lo de este espejo no la toca.
  const otra = await abrir(1366, 768, TOKEN_OTRA, "/#/productos");

  // Al abrirse el celular, los dos lo dicen, y el celular va a donde está la computadora.
  await expect(compu.getByTestId("espejo-estado")).toContainText("En espejo con el celular");
  await expect(celular.getByTestId("espejo-estado")).toContainText("En espejo con la computadora");
  await expect(celular.getByTestId("menu-vender")).toHaveAttribute("aria-current", "page");

  // La venta es una sola: lo que se agrega en la computadora aparece en el celular…
  const busqueda = compu.getByTestId("busqueda");
  await expect(busqueda).toBeEnabled();
  await busqueda.fill("e2e mecha espejo");
  await busqueda.press("Enter");
  await expect(compu.getByTestId("item").filter({ hasText: "MECHA ESPEJO" })).toBeVisible();
  const enElCelular = celular.getByTestId("item").filter({ hasText: "MECHA ESPEJO" });
  await expect(enElCelular).toBeVisible();
  // …y la cantidad y el medio de pago que se cambian en el celular, en la computadora.
  await enElCelular.getByTestId("cantidad").fill("3");
  await enElCelular.getByTestId("cantidad").blur();
  await expect(compu.getByTestId("item").filter({ hasText: "MECHA ESPEJO" }).getByTestId("cantidad")).toHaveValue("3");
  await celular.getByRole("radio", { name: /Tarjeta/ }).click();
  await expect(compu.getByRole("radio", { name: /Tarjeta/ })).toHaveAttribute("aria-checked", "true");

  // La navegación va junta, en las dos direcciones.
  await celular.getByTestId("menu-deposito").click();
  await expect(compu.getByTestId("pestana-pedidos")).toHaveAttribute("aria-current", "page");
  await compu.getByTestId("pestana-stock").click();
  await expect(celular.getByRole("tab", { name: "Inventario" })).toHaveAttribute("aria-selected", "true");
  // La otra persona sigue donde estaba.
  await expect(otra.getByTestId("pestana-productos")).toHaveAttribute("aria-current", "page");
  await expect(otra.getByTestId("espejo")).toHaveCount(0);

  // Pausar los separa: el celular se mueve y la computadora no. Al reanudar manda la computadora.
  await celular.getByTestId("pausar-espejo").click();
  await expect(compu.getByTestId("espejo-estado")).toContainText("en pausa");
  await celular.getByTestId("menu-catalogo").click();
  await expect(celular.getByTestId("menu-catalogo")).toHaveAttribute("aria-current", "page");
  await compu.waitForTimeout(800);
  await expect(compu.getByTestId("pestana-stock")).toHaveAttribute("aria-current", "page");
  await celular.getByTestId("pausar-espejo").click();
  await expect(celular.getByRole("tab", { name: "Inventario" })).toHaveAttribute("aria-selected", "true");
  await expect(compu.getByTestId("espejo-estado")).toContainText("En espejo con el celular");

  // Desvincular es el corte definitivo: los dos quedan sueltos y la computadora ofrece vincular.
  await compu.getByTestId("desvincular-espejo").click();
  await expect(compu.getByTestId("espejo")).toHaveCount(0);
  await expect(compu.getByTestId("emparejar-celular")).toBeVisible();
  await expect(celular.getByTestId("espejo")).toHaveCount(0);
  await celular.getByTestId("menu-vender").click();
  await compu.waitForTimeout(800);
  await expect(compu.getByTestId("pestana-stock")).toHaveAttribute("aria-current", "page");
});
