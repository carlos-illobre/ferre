import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Procesos (specs/011-procesos) en la computadora: dibujar con bpmn-js de verdad, pasando por
// el servidor de Ferrebress y el servicio de Procesos (ADR-019).
const TOKEN = "token-e2e-procesos-escritorio";
const EMAIL = "e2e-procesos-escritorio@ferre.test";
const TOKEN_LECTOR = "token-e2e-procesos-lector";
const EMAIL_LECTOR = "e2e-procesos-lector@ferre.test";
const ROL_LECTOR = "00000000-0000-4000-9000-0000000000e1";

function psql(sql: string): string {
  return execSync(`docker compose exec -T db psql -U ferre -d ferre -tAc "${sql.replace(/"/g, '\\"')}"`, { cwd: "../..", encoding: "utf8" }).trim();
}

function crearUsuario(email: string, token: string, roles: string) {
  const id = `(SELECT id FROM usuario WHERE email = '${email}')`;
  psql(`DELETE FROM sesion WHERE usuario_id IN ${id}`);
  psql(`DELETE FROM evento WHERE usuario_id IN ${id}`);
  psql(`DELETE FROM usuario_rol WHERE usuario_id IN ${id}`);
  psql(`DELETE FROM usuario WHERE email = '${email}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${email}', 'Procesos E2E', 'mostrador')`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE ${roles} AND u.email = '${email}'`);
  const hash = createHash("sha256").update(token).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${email}'`);
}

test.beforeAll(() => {
  // El esquema lo crea el servicio de Procesos al arrancar.
  psql("DELETE FROM procesos.proceso");
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  crearUsuario(EMAIL, TOKEN, "r.id::text LIKE '00000000-0000-4000-8000-%'");
  psql(`DELETE FROM rol_permiso WHERE rol_id = '${ROL_LECTOR}'`);
  psql(`INSERT INTO rol (id, nombre, descripcion) VALUES ('${ROL_LECTOR}', 'Lector de procesos E2E', 'Solo mira procesos') ON CONFLICT (id) DO NOTHING`);
  psql(`INSERT INTO rol_permiso (rol_id, permiso) VALUES ('${ROL_LECTOR}', 'procesos.ver') ON CONFLICT DO NOTHING`);
  crearUsuario(EMAIL_LECTOR, TOKEN_LECTOR, `r.id = '${ROL_LECTOR}'`);
});

async function entrar(page: Page, token = TOKEN) {
  await page.addInitScript((t) => localStorage.setItem("ferre.sesion", t), token);
  await page.goto("/#/procesos");
}
const formas = (page: Page) => page.locator("g.djs-element.djs-shape:not([data-element-id$='_label']):not([data-element-id^='Proceso']):not([data-element-id^='Participant']):not([data-element-id^='Lane'])");

async function arrastrar(page: Page, desde: string, x: number, y: number) {
  const figura = await page.getByTestId(desde).boundingBox();
  const lienzo = await page.getByTestId("procesos-lienzo").boundingBox();
  await page.mouse.move(figura!.x + figura!.width / 2, figura!.y + figura!.height / 2);
  await page.mouse.down();
  await page.mouse.move(lienzo!.x + x, lienzo!.y + y, { steps: 12 });
  await page.mouse.up();
}

test("011-E02 011-E04 011-E05 011-E09 011-E10 011-E13 011-E14 011-E15 011-E22 dibujar un proceso con el mouse y el teclado, guardarlo solo y marcarlo vigente", async ({ page }) => {
  await entrar(page);
  await page.getByTestId("procesos-nuevo").click();
  await page.getByTestId("procesos-nombre").fill("Venta E2E");
  await page.getByTestId("procesos-aceptar-nombre").click();
  await expect(page.getByTestId("procesos-estado")).toHaveText("Borrador");
  await expect(formas(page)).toHaveCount(1);

  // E02: una tarea arrastrada desde la izquierda queda donde se soltó, elegida, con su panel abierto.
  await arrastrar(page, "procesos-figura-tarea", 420, 180);
  await expect(formas(page)).toHaveCount(2);
  await expect(page.getByTestId("procesos-panel-paso")).toHaveClass(/abierto/);
  // E14: todavía no le llega ninguna flecha.
  await expect(page.locator(".procesos-marca-error")).toHaveCount(1);

  // E15: un nombre largo se parte en renglones dentro de la figura.
  const largo = "Revisar que el producto esté en la estantería correcta y anotar si falta";
  await page.getByTestId("procesos-paso-nombre").fill(largo);
  await page.getByTestId("procesos-paso-nombre").press("Enter");
  const tarea = page.locator("g.djs-element.djs-shape").filter({ hasText: "Revisar que" });
  const caja = await tarea.locator(".djs-visual rect").first().boundingBox();
  const texto = await tarea.locator(".djs-visual text").first().boundingBox();
  await page.screenshot({ path: "test-results/procesos-largo.png" });
  expect(await tarea.locator("text tspan").count()).toBeGreaterThan(1);
  expect(texto!.width).toBeLessThanOrEqual(caja!.width);
  expect(texto!.y).toBeGreaterThanOrEqual(caja!.y);
  expect(texto!.y + texto!.height).toBeLessThanOrEqual(caja!.y + caja!.height);

  // E04: se une el inicio con la tarea, desde la botonera del paso.
  await page.locator("g.djs-element[data-element-id^='Inicio_']:not([data-element-id$='_label'])").click();
  await page.locator(".djs-context-pad .entry[data-action='connect']").click();
  await tarea.click();
  await expect(page.locator(".procesos-marca-error")).toHaveCount(0);
  await expect(page.getByTestId("procesos-errores-generales")).toHaveText("Falta el fin");

  // E05: mover la tarea la deja en otro lugar, con su flecha.
  // Primero se deja de elegir la flecha recién hecha, que tiene su botonera encima de la tarea.
  const fondo = await page.getByTestId("procesos-lienzo").boundingBox();
  await page.mouse.click(fondo!.x + 60, fondo!.y + fondo!.height - 120);
  const antes = await tarea.locator("rect.djs-hit").first().boundingBox();
  await page.mouse.move(antes!.x + 20, antes!.y + 12);
  await page.mouse.down();
  await page.mouse.move(antes!.x + 140, antes!.y + 72, { steps: 10 });
  await page.mouse.up();
  const despues = await tarea.locator("rect.djs-hit").first().boundingBox();
  expect(despues!.x).toBeGreaterThan(antes!.x + 60);

  // E13: con el teclado, Insert agrega una tarea a continuación; Supr la quita y Ctrl+Z la devuelve.
  await tarea.click();
  await page.keyboard.press("Insert");
  await expect(formas(page)).toHaveCount(3);
  await page.keyboard.press("Delete");
  await expect(formas(page)).toHaveCount(2);
  await page.keyboard.press("Control+z");
  await expect(formas(page)).toHaveCount(3);

  // E09: la rueda acerca y aleja; «Ver todo» lo ajusta a la pantalla.
  const zoom = page.locator(".procesos-zoom [aria-label='Tamaño del dibujo']");
  const zoomAntes = await zoom.textContent();
  const lienzo = await page.getByTestId("procesos-lienzo").boundingBox();
  await page.mouse.move(lienzo!.x + 300, lienzo!.y + 200);
  await page.mouse.wheel(0, -400);
  await expect(zoom).not.toHaveText(zoomAntes!);
  await page.getByRole("button", { name: "Ver todo" }).click();

  // E10: se guardó solo, en el borrador.
  await expect(page.getByTestId("procesos-guardado")).toHaveText("Guardado");
  await expect.poll(() => psql("SELECT pasos FROM procesos.version v JOIN procesos.proceso p ON p.id = v.proceso_id WHERE p.nombre = 'Venta E2E' AND v.estado = 'borrador'")).toBe("3");

  // E22: marcarlo vigente queda en «Quién hizo qué».
  await page.getByTestId("procesos-marcar-vigente").click();
  await expect(page.getByTestId("procesos-estado")).toHaveText("Vigente");
  expect(psql(`SELECT count(*) FROM evento e JOIN usuario u ON u.id = e.usuario_id WHERE u.email = '${EMAIL}' AND e.tipo = 'proceso.vigente'`)).toBe("1");
});

test("011-E33 011-E34 exportar baja una imagen PNG y un BPMN con el nombre del proceso", async ({ page }) => {
  await entrar(page);
  await expect(page.getByTestId("procesos-lienzo")).toBeVisible();
  await page.getByTestId("procesos-exportar").click();
  const [bpmn] = await Promise.all([page.waitForEvent("download"), page.getByTestId("procesos-exportar-bpmn").click()]);
  expect(bpmn.suggestedFilename()).toBe("Venta E2E.bpmn");
  expect(readFileSync((await bpmn.path())!, "utf8")).toMatch(/<bpmn:definitions[\s\S]*Revisar que el producto/);
  await page.getByTestId("procesos-exportar").click();
  const [png] = await Promise.all([page.waitForEvent("download"), page.getByTestId("procesos-exportar-png").click()]);
  expect(png.suggestedFilename()).toBe("Venta E2E.png");
  const datos = readFileSync((await png.path())!);
  expect(datos.subarray(0, 4).toString("hex")).toBe("89504e47");
  expect(datos.length).toBeGreaterThan(5000);
});

test("011-E37 011-E38 quien solo puede ver mira el vigente sin poder cambiarlo; sin permiso, Más no lo ofrece", async ({ page }) => {
  await entrar(page, TOKEN_LECTOR);
  await expect(page.getByTestId("procesos-lienzo")).toBeVisible();
  await expect(page.getByTestId("procesos-estado")).toHaveText("Vigente");
  for (const id of ["procesos-panel-figuras", "procesos-importar", "procesos-exportar", "procesos-nuevo"]) await expect(page.getByTestId(id)).toHaveCount(0);
  await expect(page.locator(".djs-context-pad")).toHaveCount(0);

  psql(`DELETE FROM rol_permiso WHERE rol_id = '${ROL_LECTOR}' AND permiso = 'procesos.ver'`);
  psql(`INSERT INTO rol_permiso (rol_id, permiso) VALUES ('${ROL_LECTOR}', 'ventas.ver')`);
  await page.goto("/#/mas");
  await page.reload();
  await expect(page.getByTestId("mas")).toBeVisible();
  await expect(page.getByTestId("mas-procesos")).toHaveCount(0);
});
