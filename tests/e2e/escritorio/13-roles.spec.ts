import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { API, psql } = stack("escritorio");

const CELULAR = false;

// Permisos y roles (RF-72, RF-75): cada persona ve y puede lo que le dejan sus roles; un rol
// se arma con un nombre y permisos, y al asignarlo la persona gana ese acceso.
const TOKEN_ADMIN = "token-e2e-roles-admin";
const TOKEN_VENDEDOR = "token-e2e-roles-vendedor";
const EMAIL_ADMIN = "e2e-roles-admin@ferre.test";
const EMAIL_VENDEDOR = "e2e-roles-vendedor@ferre.test";
const ROL_NUEVO = "Encargado E2E";
// Los roles con los que arranca el sistema tienen id fijo (migración 0015).
const VENDEDOR = "00000000-0000-4000-8000-0000000000a1";
const ADMINISTRADOR = "00000000-0000-4000-8000-0000000000a4";
const RUTAS = CELULAR
  ? { mas: "mas", usuarios: "mas/usuarios", roles: "mas/roles", numeros: "mas/negocio", gastos: "mas/gastos", deposito: "deposito", enMas: "mas-negocio" }
  : { mas: "mas", usuarios: "usuarios", roles: "roles", numeros: "resumen", gastos: "gastos", deposito: "stock", enMas: "menu-negocio" };

test.beforeAll(() => {
  for (const e of [EMAIL_ADMIN, EMAIL_VENDEDOR]) {
    psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${e}')`);
    psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${e}')`);
    psql(`DELETE FROM usuario WHERE email = '${e}'`);
  }
  psql(`DELETE FROM usuario_rol WHERE rol_id IN (SELECT id FROM rol WHERE nombre = '${ROL_NUEVO}')`);
  psql(`DELETE FROM rol WHERE nombre = '${ROL_NUEVO}'`);
  psql(`INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), '${EMAIL_ADMIN}', 'Admin roles E2E'), (gen_random_uuid(), '${EMAIL_VENDEDOR}', 'Vendedor roles E2E')`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT id, '${ADMINISTRADOR}' FROM usuario WHERE email = '${EMAIL_ADMIN}'`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT id, '${VENDEDOR}' FROM usuario WHERE email = '${EMAIL_VENDEDOR}'`);
  for (const [token, email] of [[TOKEN_ADMIN, EMAIL_ADMIN], [TOKEN_VENDEDOR, EMAIL_VENDEDOR]]) {
    const hash = createHash("sha256").update(token!).digest("hex");
    psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${email}'`);
  }
});

async function entrarComo(page: Page, token: string, ruta: string) {
  await page.goto("/");
  await page.evaluate((t) => localStorage.setItem("ferre.sesion", t), token);
  await page.goto(`/#/${ruta}`);
  await page.reload();
}

test("quien solo vende no ve los números ni la administración, y el servidor tampoco lo deja", async ({ page }) => {
  await entrarComo(page, TOKEN_VENDEDOR, RUTAS.mas);
  await expect(page.getByTestId("mas-tickets")).toBeVisible();
  for (const oculto of [RUTAS.enMas, "mas-roles", "mas-actividad", "mas-anomalias"]) await expect(page.getByTestId(oculto)).toHaveCount(0);
  // Sin ninguna pestaña de Usuarios, no tiene «Usuarios» en Más; su huella está en Configuración (decisiones 99 y 100).
  await expect(page.getByTestId("mas-usuarios")).toHaveCount(0);
  // En la computadora no hay «Volver a Más»: se vuelve con «Más» del menú (decisión 90).
  if (!CELULAR) await expect(page.getByRole("button", { name: "Volver a Más" })).toHaveCount(0);
  await page.goto(`/#/${RUTAS.mas}`);

  // Configuración la ve cualquiera, sin permisos (RF-83, E06). Deshabilitar las animaciones vale
  // en el momento (E02) y queda en el dispositivo aunque se recargue (E03).
  await page.getByTestId("mas-configuracion").click();
  await expect(page.getByTestId("cfg-animaciones")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("cfg-animaciones").click();
  await expect(page.locator("html")).toHaveAttribute("data-animaciones", "no");
  await page.reload();
  await expect(page.getByTestId("cfg-animaciones")).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("html")).toHaveAttribute("data-animaciones", "no");

  // Por la dirección tampoco: dice qué permisos hacen falta (013-E05).
  await entrarComo(page, TOKEN_VENDEDOR, RUTAS.numeros);
  await expect(page.getByTestId("sin-permiso")).toContainText("Ver las ventas del negocio");

  // En Depósito solo queda mirar el inventario: ni ingresar mercadería ni contar ni corregir.
  await entrarComo(page, TOKEN_VENDEDOR, RUTAS.deposito);
  await expect(page.getByTestId("tabla-stock")).toBeVisible();
  // 013-E09: sin «Ver el dinero invertido», ni el total ni el valor de cada producto.
  await expect(page.getByTestId("dinero-invertido-stock")).toHaveCount(0);
  await expect(page.getByTestId("valor-stock")).toHaveCount(0);
  await expect(CELULAR ? page.getByRole("tab", { name: "Compras" }) : page.getByTestId("pestana-compras")).toHaveCount(0);
  await expect(CELULAR ? page.getByRole("tab", { name: "Contar" }) : page.getByTestId("pestana-contar")).toHaveCount(0);

  const estados = await page.evaluate(async ([token, API]) => {
    const cabeceras = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const pedir = (ruta: string, metodo = "GET", cuerpo?: unknown) => fetch(`${API}${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo ? JSON.stringify(cuerpo) : undefined }).then((r) => r.status);
    return [await pedir("/compras/semana"), await pedir("/usuarios"), await pedir("/roles", "POST", { nombre: "Rol colado", permisos: ["admin.roles"] }), await pedir("/auditoria")];
  }, [TOKEN_VENDEDOR, API] as const);
  expect(estados).toEqual([403, 403, 403, 403]);
});

test("se arma un rol, se lo asigna y la persona gana ese acceso", async ({ page }) => {
  await entrarComo(page, TOKEN_ADMIN, RUTAS.roles);
  await page.getByTestId("rol-nuevo").click();
  await page.getByTestId("nombre-rol").fill(ROL_NUEVO);
  await page.getByTestId("permiso-negocio.ventas").check();
  await page.getByTestId("guardar-rol").click();
  await expect(page.getByTestId("lista-de-roles")).toContainText(ROL_NUEVO);

  await entrarComo(page, TOKEN_ADMIN, RUTAS.usuarios);
  // Como la v2 (021): se elige a la persona en la lista y los roles se cambian en su ficha, al lado.
  await page.getByTestId("usuario-fila").filter({ hasText: EMAIL_VENDEDOR }).click();
  const fila = page.getByTestId("ficha-usuario");
  await expect(fila).toContainText(EMAIL_VENDEDOR);
  await fila.getByTestId("cambiar-roles").click();
  await fila.getByTestId(`rol-${ROL_NUEVO}`).check();
  await fila.getByTestId("guardar-roles").click();
  await expect(fila.getByTestId("roles-de-usuario")).toContainText(ROL_NUEVO);

  await entrarComo(page, TOKEN_VENDEDOR, RUTAS.numeros);
  await expect(page.getByTestId("resumen-hoy")).toBeVisible();
  // 013-E13: con una sola sección, el título de la parte y sin segmentos de secciones (la v2, decisión 149).
  await expect(page.getByRole("heading", { name: "Negocio", exact: true })).toBeVisible();
  await expect(page.locator("[data-testid^='seccion-']")).toHaveCount(0);
  await expect(page.getByTestId("sin-permiso")).toHaveCount(0);
  await expect.poll(() => psql(`SELECT count(*) FROM evento WHERE tipo = 'rol.creado' AND usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL_ADMIN}')`)).toBe("1");
});

test("nadie se quita a sí mismo la administración, y un rol en uso no se borra", async ({ page }) => {
  await entrarComo(page, TOKEN_ADMIN, RUTAS.roles);
  await expect(page.getByTestId("lista-de-roles")).toBeVisible();
  // El rol que alguien tiene no ofrece «Borrar».
  await expect(page.getByTestId("rol").filter({ hasText: ROL_NUEVO }).getByTestId("borrar-rol")).toHaveCount(0);

  const estados = await page.evaluate(async ([token, email, API, vendedor, administrador]) => {
    const cabeceras = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
    const lista = (await (await fetch(`${API}/usuarios`, { headers: cabeceras })).json()) as { id: string; email: string }[];
    const yo = lista.find((u) => u.email === email)!;
    const cambiar = (cuerpo: unknown) => fetch(`${API}/usuarios/${yo.id}`, { method: "PATCH", headers: cabeceras, body: JSON.stringify(cuerpo) }).then((r) => r.status);
    const borrar = await fetch(`${API}/roles/${administrador}`, { method: "DELETE", headers: cabeceras }).then((r) => r.status);
    return [await cambiar({ roles: [vendedor] }), await cambiar({ activo: false }), await cambiar({ roles: [] }), borrar];
  }, [TOKEN_ADMIN, EMAIL_ADMIN, API, VENDEDOR, ADMINISTRADOR] as const);
  for (const e of estados) expect(e).toBeGreaterThanOrEqual(400);
  await expect.poll(() => psql(`SELECT count(*) FROM usuario_rol WHERE rol_id = '${ADMINISTRADOR}' AND usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL_ADMIN}')`)).toBe("1");
  await expect.poll(() => psql(`SELECT activo::text FROM usuario WHERE email = '${EMAIL_ADMIN}'`)).toBe("true");
});

// 013: Cómo va el negocio en tres secciones, cada una con su permiso de lectura (decisión 95).
const TOKEN_GASTOS = "token-e2e-roles-gastos";
const EMAIL_GASTOS = "e2e-roles-gastos@ferre.test";
const ROL_GASTOS = "Gastos e inventario E2E";
const GERENTE = "00000000-0000-4000-8000-0000000000a5";

test("013: las secciones de Cómo va el negocio siguen los permisos de cada rol", async ({ page }) => {
  // 013-E07: el permiso viejo ya no lo tiene nadie; el Gerente, que lo tenía, tiene los tres nuevos.
  expect(psql(`SELECT count(*) FROM rol_permiso WHERE permiso = 'negocio.numeros'`)).toBe("0");
  expect(psql(`SELECT count(*) FROM rol_permiso WHERE rol_id = '${GERENTE}' AND permiso IN ('negocio.ventas', 'negocio.gastos', 'negocio.invertido')`)).toBe("3");

  // 013-E19: un rol con «Ver los gastos» y «Ver el dinero invertido», y nada de ventas.
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL_GASTOS}')`);
  psql(`DELETE FROM evento WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL_GASTOS}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL_GASTOS}'`);
  psql(`DELETE FROM usuario_rol WHERE rol_id IN (SELECT id FROM rol WHERE nombre = '${ROL_GASTOS}')`);
  psql(`DELETE FROM rol WHERE nombre = '${ROL_GASTOS}'`);
  psql(`INSERT INTO rol (id, nombre, descripcion) VALUES (gen_random_uuid(), '${ROL_GASTOS}', 'Prueba')`);
  psql(`INSERT INTO rol_permiso (rol_id, permiso) SELECT id, p FROM rol, unnest(ARRAY['negocio.gastos', 'negocio.invertido']) AS p WHERE nombre = '${ROL_GASTOS}'`);
  psql(`INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), '${EMAIL_GASTOS}', 'Gastos E2E')`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u, rol r WHERE u.email = '${EMAIL_GASTOS}' AND r.nombre = '${ROL_GASTOS}'`);
  const hash = createHash("sha256").update(TOKEN_GASTOS).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL_GASTOS}'`);

  // 013-E12: Negocio, en el menú, abre la primera sección que puede ver, Compras, con sus segmentos de dos (decisión 149).
  await entrarComo(page, TOKEN_GASTOS, RUTAS.mas);
  await page.getByTestId(RUTAS.enMas).click();
  await expect(page).toHaveURL(new RegExp(`#/${RUTAS.gastos}$`));
  await expect(page.getByTestId("gastos-semana")).toBeVisible();
  await expect(page.getByTestId("compras-recientes")).toHaveCount(0);
  if (CELULAR) {
    await expect(page.locator("[data-testid^='seccion-']:not([disabled])")).toHaveCount(2);
    await expect(page.getByTestId("seccion-compras")).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("seccion-inventario")).toBeVisible();
  } else {
    await expect(page.getByTestId("pestana-resumen")).toHaveCount(0);
    // 013-E14: sin «Volver a Más» y sin atajo Alt; con las flechas se pasa de sección y Enter la abre.
    await expect(page.getByRole("button", { name: "Volver a Más" })).toHaveCount(0);
    await expect(page.getByTestId("seccion-compras")).not.toHaveAttribute("aria-keyshortcuts", /Alt/);
    await expect(page.getByTestId("actualizar-negocio").locator("svg")).toHaveCount(1);
    // Las secciones son segmentos, como la v2: con las flechas se pasa a la otra.
    await page.getByTestId("seccion-compras").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(/#\/invertido$/);
    await expect(page.getByTestId("seccion-inventario")).toBeFocused();
    await expect(page.getByTestId("dinero-invertido-total")).toBeVisible();
  }
  // 013-E17: por la dirección de Ventas, dice que hace falta «Ver las ventas del negocio».
  await entrarComo(page, TOKEN_GASTOS, RUTAS.numeros);
  await expect(page.getByTestId("sin-permiso")).toContainText("Ver las ventas del negocio");
  await expect(page.getByTestId("sin-permiso")).not.toContainText("Ver los gastos");
  // 013-E06: el servidor tampoco le da las ventas ni lo que no llevaron.
  const estados = await page.evaluate(async ([token, API]) => {
    const cabeceras = { Authorization: `Bearer ${token}` };
    return [(await fetch(`${API}/consultas`, { headers: cabeceras })).status, (await fetch(`${API}/compras/semana`, { headers: cabeceras })).status];
  }, [TOKEN_GASTOS, API] as const);
  expect(estados).toEqual([403, 200]);
});
