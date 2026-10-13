import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

// La API del stack contra el que corren los escenarios (API_URL permite otro puerto).
const API = process.env.API_URL ?? "http://localhost";
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
  ? { mas: "mas", usuarios: "mas/usuarios", roles: "mas/roles", numeros: "mas/negocio", deposito: "deposito", enMas: "mas-negocio" }
  : { mas: "mas", usuarios: "usuarios", roles: "roles", numeros: "resumen", deposito: "stock", enMas: "mas-resumen" };

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

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

  // Configuración la ve cualquiera, sin permisos (RF-80, E06). Deshabilitar las animaciones vale
  // en el momento (E02) y queda en el dispositivo aunque se recargue (E03).
  await page.getByTestId("mas-configuracion").click();
  await expect(page.getByTestId("cfg-animaciones")).toHaveAttribute("aria-checked", "true");
  await page.getByTestId("cfg-animaciones").click();
  await expect(page.locator("html")).toHaveAttribute("data-animaciones", "no");
  await page.reload();
  await expect(page.getByTestId("cfg-animaciones")).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("html")).toHaveAttribute("data-animaciones", "no");

  // Por la dirección tampoco: dice qué permiso hace falta.
  await entrarComo(page, TOKEN_VENDEDOR, RUTAS.numeros);
  await expect(page.getByTestId("sin-permiso")).toContainText("Ver los números del negocio");

  // En Depósito solo queda mirar el inventario: ni ingresar mercadería ni contar ni corregir.
  await entrarComo(page, TOKEN_VENDEDOR, RUTAS.deposito);
  await expect(page.getByText("Inventario").first()).toBeVisible();
  await expect(CELULAR ? page.getByRole("tab", { name: "Ingreso" }) : page.getByTestId("pestana-compras")).toHaveCount(0);
  await expect(CELULAR ? page.getByRole("tab", { name: "Estanterías" }) : page.getByTestId("pestana-contar")).toHaveCount(0);

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
  await page.getByTestId("permiso-negocio.numeros").check();
  await page.getByTestId("guardar-rol").click();
  await expect(page.getByTestId("lista-de-roles")).toContainText(ROL_NUEVO);

  await entrarComo(page, TOKEN_ADMIN, RUTAS.usuarios);
  const fila = page.getByTestId("usuario-fila").filter({ hasText: EMAIL_VENDEDOR });
  await fila.getByTestId("cambiar-roles").click();
  await fila.getByTestId(`rol-${ROL_NUEVO}`).check();
  await fila.getByTestId("guardar-roles").click();
  await expect(fila.getByTestId("roles-de-usuario")).toContainText(ROL_NUEVO);

  await entrarComo(page, TOKEN_VENDEDOR, RUTAS.numeros);
  await expect(page.getByTestId("resumen-hoy")).toBeVisible();
  await expect(page.getByTestId("sin-permiso")).toHaveCount(0);
  expect(psql(`SELECT count(*) FROM evento WHERE tipo = 'rol.creado' AND usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL_ADMIN}')`)).toBe("1");
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
  expect(psql(`SELECT count(*) FROM usuario_rol WHERE rol_id = '${ADMINISTRADOR}' AND usuario_id = (SELECT id FROM usuario WHERE email = '${EMAIL_ADMIN}')`)).toBe("1");
  expect(psql(`SELECT activo::text FROM usuario WHERE email = '${EMAIL_ADMIN}'`)).toBe("true");
});
