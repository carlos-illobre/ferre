import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// El espejo entre el celular y la computadora emparejados (decisión 60): están en la misma
// parte y comparten la venta en curso; «Desconectar» los separa un rato; cada emparejamiento es de
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
  // El pedido borrador que deja la prueba apunta al usuario: se borra antes que él.
  psql(`DELETE FROM pedido WHERE proveedor_id = '${ID_PROV}'`);
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
  psql(`INSERT INTO movimiento_stock (id, producto_id, tipo, cantidad, referencia_tipo, fecha, nota) VALUES (gen_random_uuid(), '${ID_MECHA}', 'ajuste', 20, 'conteo', now(), 'stock inicial e2e')`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_MECHA}', '${ID_PROV}', 'ME8', 1000, '[]', 1000, 0.21, '2026-08-01')`);
});

test("emparejados y abiertos los dos, van juntos: la parte, la venta, la pausa y desvincular", async ({ browser }) => {
  // Es un recorrido largo, con tres ventanas: necesita más que los 30 segundos de siempre.
  test.setTimeout(90_000);
  const abrir = async (ancho: number, alto: number, token: string, ruta: string) => {
    const pagina = await (await browser.newContext({ viewport: { width: ancho, height: alto } })).newPage();
    await pagina.addInitScript((t) => localStorage.setItem("ferre.sesion", t), token);
    await pagina.goto(ruta);
    return pagina;
  };
  let compu = await abrir(1366, 768, TOKEN_COMPU, "/#/vender");
  await expect(compu.getByTestId("espejo-estado")).toContainText("El celular no está abierto");
  const celular = await abrir(390, 844, TOKEN_CELULAR, "/#/catalogo");
  // Otra persona, con su propia computadora y sin emparejar: lo de este espejo no la toca.
  const otra = await abrir(1366, 768, TOKEN_OTRA, "/#/productos");

  // Al abrirse el celular, los dos lo dicen, y el celular va a donde está la computadora.
  await expect(compu.getByTestId("espejo-estado")).toContainText("Conectado con el celular");
  await expect(celular.getByTestId("desconectar-arriba")).toHaveClass(/vinculado/);
  await expect(celular.getByTestId("menu-vender")).toHaveAttribute("aria-current", "page");
  // Vinculado, el único botón del encabezado del celular es «Desconectar»; el de vincular no está (decisión 73).
  await expect(celular.getByTestId("desconectar-arriba")).toBeVisible();
  await expect(celular.getByTestId("vincular-arriba")).toHaveCount(0);

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

  // Se cobra en la computadora: la venta se vacía en los dos, y el celular se entera.
  await compu.getByTestId("cobrar").click();
  await expect(compu.getByTestId("exito")).toContainText("Venta registrada");
  await expect(celular.getByTestId("espejo-aviso")).toContainText("cobrada en la computadora");
  await expect(celular.getByTestId("item")).toHaveCount(0);
  await compu.getByTestId("cerrar-exito").click();

  // La navegación va junta, en las dos direcciones.
  await celular.getByTestId("menu-deposito").click();
  await expect(compu.getByTestId("pestana-stock")).toHaveAttribute("aria-current", "page");
  await compu.getByTestId("pestana-pedidos").click();
  await expect(celular.getByRole("tab", { name: "Pedidos" })).toHaveAttribute("aria-selected", "true");
  // La otra persona sigue donde estaba.
  await expect(otra.getByTestId("pestana-productos")).toHaveAttribute("aria-current", "page");
  await expect(otra.getByTestId("espejo")).toHaveCount(0);

  // El ingreso de mercadería también es uno solo: el proveedor que se elige en la computadora…
  await compu.getByTestId("pestana-compras").click();
  await expect(celular.getByRole("tab", { name: "Ingreso" })).toHaveAttribute("aria-selected", "true");
  await compu.getByTestId("proveedor").selectOption({ label: "Proveedor espejo (e2e)" });
  await expect(celular.getByTestId("proveedor")).toContainText("Proveedor espejo (e2e)");
  // …el renglón que se agrega en el celular, y la cantidad que se corrige en la computadora.
  await celular.getByTestId("busqueda").fill("e2e mecha espejo");
  await celular.getByTestId("busqueda").press("Enter");
  const llego = compu.getByTestId("renglon").filter({ hasText: "MECHA ESPEJO" });
  await expect(llego).toBeVisible();
  await llego.getByTestId("cantidad").fill("5");
  await llego.getByTestId("cantidad").blur();
  await expect(celular.getByTestId("renglon").filter({ hasText: "MECHA ESPEJO" }).getByTestId("cantidad")).toHaveValue("5");

  // Y el pedido a un proveedor: el que se abre en el celular se abre en la computadora, con sus renglones.
  await celular.getByRole("tab", { name: "Pedidos" }).click();
  await expect(compu.getByTestId("pestana-pedidos")).toHaveAttribute("aria-current", "page");
  await celular.getByTestId("pedido-nuevo").click();
  await celular.getByTestId("proveedor-opcion").filter({ hasText: "Proveedor espejo (e2e)" }).click();
  await expect(compu.getByTestId("armar-pedido")).toContainText("Pedido a Proveedor espejo (e2e)");
  await compu.getByTestId("buscar-para-pedir").fill("e2e mecha espejo");
  await compu.getByTestId("resultado-para-pedir").first().click();
  await expect(celular.getByTestId("renglon-pedido").filter({ hasText: "MECHA ESPEJO" })).toBeVisible();
  await celular.getByTestId("volver-a-pedidos").click();
  await expect(compu.getByTestId("armar-pedido")).toHaveCount(0);
  await compu.getByTestId("pestana-stock").click();
  await expect(celular.getByRole("tab", { name: "Inventario" })).toHaveAttribute("aria-selected", "true");

  // Dónde se está parado lo decide la computadora (decisión 71): si se la abre de nuevo en otra
  // pantalla con el celular ya abierto, el celular va a ella y no al revés.
  await compu.goto("/?de-nuevo=1#/productos");
  await expect(compu.getByTestId("espejo-estado")).toContainText("Conectado con el celular");
  await expect(celular.getByTestId("menu-catalogo")).toHaveAttribute("aria-current", "page");
  await expect(compu.getByTestId("pestana-productos")).toHaveAttribute("aria-current", "page");
  await compu.getByTestId("menu-deposito").click();
  await expect(celular.getByRole("tab", { name: "Inventario" })).toHaveAttribute("aria-selected", "true");

  // «Desconectar» hace que cada uno vaya por su lado: el celular se mueve y la computadora no. Al «Reconectar» manda la computadora.
  await celular.getByTestId("desconectar-arriba").click();
  await expect(compu.getByTestId("espejo-estado")).toContainText("Desconectados");
  await celular.getByTestId("menu-catalogo").click();
  await expect(celular.getByTestId("menu-catalogo")).toHaveAttribute("aria-current", "page");
  await compu.waitForTimeout(800);
  await expect(compu.getByTestId("pestana-stock")).toHaveAttribute("aria-current", "page");
  await celular.getByTestId("reconectar-arriba").click();
  await expect(celular.getByRole("tab", { name: "Inventario" })).toHaveAttribute("aria-selected", "true");
  await expect(compu.getByTestId("espejo-estado")).toContainText("Conectado con el celular");

  // El vínculo es de los dispositivos y del usuario (decisión 73): si la persona sale de la
  // computadora y vuelve a entrar ahí, sigue vinculada sin escanear nada.
  const dispositivo = await compu.evaluate(() => localStorage.getItem("ferre.dispositivo"));
  expect(dispositivo).toBeTruthy();
  await expect.poll(() => psql(`SELECT dispositivo_id FROM sesion WHERE token_hash = '${hash(TOKEN_COMPU)}'`)).toBe(dispositivo);
  psql(`UPDATE puesto SET usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL}'), compu_dispositivo = '${dispositivo}' WHERE codigo_hash = 'e2e-espejo'`);
  await compu.context().close();
  psql(`UPDATE sesion SET revocada_en = now() WHERE token_hash = '${hash(TOKEN_COMPU)}'`);
  await expect(celular.getByTestId("desconectar-arriba")).toHaveClass(/apagado/);
  const TOKEN_COMPU_2 = `${TOKEN_COMPU}-de-nuevo`;
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash(TOKEN_COMPU_2)}', 'e2e compu de nuevo', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  const enEsteDispositivo = async (token: string) => {
    const contexto = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await contexto.addInitScript(([t, d]) => { localStorage.setItem("ferre.sesion", t!); localStorage.setItem("ferre.dispositivo", d!); }, [token, dispositivo!]);
    const pagina = await contexto.newPage();
    await pagina.goto("/#/stock");
    return pagina;
  };
  // Otra persona que entra en esa misma computadora no queda vinculada con ese celular.
  const intrusa = await enEsteDispositivo(TOKEN_OTRA);
  await expect(intrusa.getByTestId("emparejar-celular")).toBeVisible();
  await expect(intrusa.getByTestId("espejo")).toHaveCount(0);
  await intrusa.context().close();
  compu = await enEsteDispositivo(TOKEN_COMPU_2);
  await expect(compu.getByTestId("espejo-estado")).toContainText("Conectado con el celular");
  await expect(celular.getByRole("tab", { name: "Inventario" })).toHaveAttribute("aria-selected", "true");

  // Desvincular es el corte definitivo y está solo en Usuarios y sesiones (decisión 74): los dos quedan sueltos y la computadora ofrece vincular.
  await expect(compu.getByTestId("desvincular-espejo")).toHaveCount(0);
  await compu.getByTestId("menu-mas").click();
  await expect(compu.getByTestId("desvincular-en-mas")).toHaveCount(0);
  await compu.getByTestId("mas-usuarios").click();
  await expect(compu.getByTestId("vinculo-actual")).toContainText("vinculada con tu celular");
  compu.once("dialog", (d) => void d.accept());
  await compu.getByTestId("desvincular-vinculo").click();
  await expect(compu.getByTestId("espejo")).toHaveCount(0);
  await expect(compu.getByTestId("emparejar-celular")).toBeVisible();
  await expect(celular.getByTestId("desconectar-arriba")).toHaveCount(0);
  await celular.getByTestId("menu-vender").click();
  await compu.waitForTimeout(800);
  await expect(compu.getByRole("heading", { name: "Usuarios y sesiones" })).toBeVisible();
  // Se cierran las tres ventanas: abiertas, seguirían vivas con estas sesiones en la prueba que sigue.
  for (const pagina of [compu, celular, otra]) await pagina.context().close();
});
