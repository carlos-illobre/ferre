import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { stack } from "../comun/stack";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { API, psql } = stack("celular");

// Procesos (specs/011-procesos) en el celular: «Pasos» que se ordenan arrastrando y «Diagrama»
// con la hoja de figuras, pasando por el servidor de Ferrebress y el servicio de Procesos.
const TOKEN = "token-e2e-procesos-celular";
const EMAIL = "e2e-procesos-celular@ferre.test";
const VENTA = readFileSync("../../microservices/procesos/web/src/modelo/ejemplos/venta.bpmn", "utf8");

test.beforeAll(() => {
  psql("DELETE FROM procesos.proceso WHERE nombre LIKE 'Venta celular E2E%'");
  const id = `(SELECT id FROM usuario WHERE email = '${EMAIL}')`;
  psql(`DELETE FROM sesion WHERE usuario_id IN ${id}`);
  psql(`DELETE FROM evento WHERE usuario_id IN ${id}`);
  psql(`DELETE FROM usuario_rol WHERE usuario_id IN ${id}`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Procesos celular E2E', 'mostrador')`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
});

async function abrirVenta(page: Page, nombre: string) {
  const creado = await page.request.post(`${API}/procesos`, { headers: { Authorization: `Bearer ${TOKEN}` }, data: { nombre, bpmn: VENTA } });
  expect(creado.status()).toBe(201);
  const { id } = (await creado.json()) as { id: string };
  await page.addInitScript((t) => localStorage.setItem("ferre.sesion", t), TOKEN);
  await page.goto("/#/mas/procesos");
  await page.getByTestId(`procesos-item-${id}`).click();
  // Abre en «Diagrama», la primera pestaña.
  await expect(page.getByTestId("procesos-pestana-diagrama")).toHaveAttribute("aria-selected", "true");
  await page.getByTestId("procesos-pestana-pasos").click();
  await expect(page.getByTestId("procesos-pasos-celu")).toBeVisible();
  return id;
}
const sinCorrerseAlCostado = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

test("011-E25 011-E26 011-E27 011-E31 los pasos se leen como lista y una tarjeta se arrastra a otra rama", async ({ page }) => {
  const id = await abrirVenta(page, "Venta celular E2E (pasos)");
  await expect(page.getByTestId("procesos-rama-F4")).toContainText("Cobrar");
  await sinCorrerseAlCostado(page);

  // Se arrastra «Cobrar» desde el asa hasta entre «Anotar el pedido» y «Pedido anotado».
  const asa = await page.getByTestId("procesos-paso-Cobrar").locator(".procesos-asa").boundingBox();
  await page.mouse.move(asa!.x + asa!.width / 2, asa!.y + asa!.height / 2);
  await page.mouse.down();
  await page.mouse.move(asa!.x + 40, asa!.y + 40, { steps: 4 });
  const ranura = page.getByTestId("procesos-ranura-Anotar>Anotado");
  await expect(ranura).toHaveClass(/visible/);
  // La ranura queda abajo, fuera de la pantalla: llevar la tarjeta al borde corre la lista.
  const alto = page.viewportSize()!.height;
  for (let i = 0; i < 30 && (await ranura.boundingBox())!.y > alto - 150; i++) await page.mouse.move(asa!.x + 40, alto - 40 + (i % 2), { steps: 1 });
  // La lista puede seguir corriéndose: se apunta a la ranura hasta que la marca como elegida.
  await expect.poll(async () => {
    const destino = await ranura.boundingBox();
    await page.mouse.move(destino!.x + 60, destino!.y + destino!.height / 2, { steps: 3 });
    return (await ranura.getAttribute("class")) ?? "";
  }).toMatch(/activa/);
  await page.mouse.up();
  await expect(page.getByTestId("procesos-rama-F5")).toContainText("Cobrar");
  await expect(page.getByTestId("procesos-rama-F4")).not.toContainText("Cobrar");

  // Quedó guardado en el borrador: «Anotar el pedido» sigue con «Cobrar».
  await expect(page.getByTestId("procesos-guardado")).toHaveText("Guardado");
  await expect.poll(() => psql(`SELECT bpmn FROM procesos.version WHERE proceso_id = '${id}' AND estado = 'borrador'`)).toMatch(/sourceRef="Anotar" targetRef="Cobrar"/);
});

test("011-E30 011-E31 «Diagrama» muestra el dibujo y la hoja de figuras; tocar una la agrega al dibujo", async ({ page }) => {
  await abrirVenta(page, "Venta celular E2E (diagrama)");
  await page.getByTestId("procesos-pestana-diagrama").click();
  await expect(page.getByTestId("procesos-hoja-figuras")).toBeVisible();
  const formas = page.locator(".procesos-dibujo-celu g.djs-element.djs-shape:not([data-element-id$='_label']):not([data-element-id^='Participante']):not([data-element-id^='Carril'])");
  await expect(formas).toHaveCount(10);
  await page.getByTestId("procesos-figura-tarea").click();
  await expect(formas).toHaveCount(11);
  await sinCorrerseAlCostado(page);
});

test("el botón de volver del celular cierra el menú «⋯», y después vuelve a la lista de procesos", async ({ page }) => {
  await abrirVenta(page, "Venta celular E2E (volver)");
  const largo = await page.evaluate(() => history.length);
  await page.getByTestId("procesos-menu-celu").click();
  await expect(page.getByTestId("procesos-hoja-menu")).toBeVisible();
  // El menú anota su paso en el historial un instante después de aparecer: si «volver» llega
  // antes (la máquina de las pruebas cargada), deshace el paso del proceso y vuelve a la lista.
  await expect.poll(() => page.evaluate(() => history.length)).toBe(largo + 1);
  await page.goBack();
  await expect(page.getByTestId("procesos-hoja-menu")).toHaveCount(0);
  await expect(page.getByTestId("procesos-pasos-celu")).toBeVisible();
  await expect(page).toHaveURL(/#\/mas\/procesos/);
  // Sin nada encima, volver lleva a la lista de procesos, no a Más.
  await page.goBack();
  await expect(page.getByTestId("procesos-lista")).toBeVisible();
  await expect(page).toHaveURL(/#\/mas\/procesos/);
});

// @tiempo: el arrastre depende de cuánto se mantiene apretado; corre al final, sin la otra interfaz a la vez (tests/e2e.sh).
test.describe("con el dedo", { tag: "@tiempo" }, () => {
  // Toques de verdad (eventos táctiles del navegador), no el mouse.
  test.use({ hasTouch: true });

  test("011-E05 011-E30 en el celular, mantener apretado un paso y arrastrarlo con el dedo lo mueve; deslizar rápido mueve el dibujo", async ({ page }) => {
    await abrirVenta(page, "Venta celular E2E (dedo)");
    await page.getByTestId("procesos-pestana-diagrama").click();
    await page.getByTestId("procesos-plegar-hoja").click();
    const paso = page.locator(".procesos-dibujo-celu g.djs-element[data-element-id='Cobrar'] .djs-hit").first();
    const antes = (await paso.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const tocar = (type: "touchStart" | "touchMove" | "touchEnd", x?: number, y?: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: x === undefined ? [] : [{ x, y: y! }] });
    const x = antes.x + antes.width / 2;
    const y = antes.y + antes.height / 2;

    // Mantener apretado y arrastrar: el paso baja.
    await tocar("touchStart", x, y);
    await page.waitForTimeout(400);
    for (let i = 1; i <= 10; i++) await tocar("touchMove", x, y + i * 8);
    await tocar("touchEnd");
    await expect.poll(async () => (await paso.boundingBox())!.y).toBeGreaterThan(antes.y + 40);
    await expect(page.getByTestId("procesos-guardado")).toHaveText("Guardado");

    // Deslizar rápido sobre un paso mueve el dibujo entero, no el paso.
    const ahora = (await paso.boundingBox())!;
    const otro = page.locator(".procesos-dibujo-celu g.djs-element[data-element-id='Buscar'] .djs-hit").first();
    const otroAntes = (await otro.boundingBox())!;
    await tocar("touchStart", ahora.x + ahora.width / 2, ahora.y + ahora.height / 2);
    for (let i = 1; i <= 6; i++) await tocar("touchMove", ahora.x + ahora.width / 2 - i * 10, ahora.y + ahora.height / 2);
    await tocar("touchEnd");
    const ahoraDespues = (await paso.boundingBox())!;
    const otroDespues = (await otro.boundingBox())!;
    expect(ahoraDespues.x).toBeLessThan(ahora.x - 30);
    expect(otroDespues.x - otroAntes.x).toBeCloseTo(ahoraDespues.x - ahora.x, 0);
  });

  test("011-E30 una figura de «Agregar un paso» se arrastra con el dedo al dibujo", async ({ page }) => {
    await abrirVenta(page, "Venta celular E2E (figura con el dedo)");
    await page.getByTestId("procesos-pestana-diagrama").click();
    const formas = page.locator(".procesos-dibujo-celu g.djs-element.djs-shape:not([data-element-id$='_label']):not([data-element-id^='Participante']):not([data-element-id^='Carril'])");
    await expect(formas).toHaveCount(10);
    const figura = (await page.getByTestId("procesos-figura-tarea").boundingBox())!;
    const lienzo = (await page.getByTestId("procesos-lienzo").boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const tocar = (type: "touchStart" | "touchMove" | "touchEnd", x?: number, y?: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: x === undefined ? [] : [{ x, y: y! }] });
    const desde = { x: figura.x + figura.width / 2, y: figura.y + figura.height / 2 };
    const hasta = { x: lienzo.x + lienzo.width / 2, y: lienzo.y + 120 };
    await tocar("touchStart", desde.x, desde.y);
    for (let i = 1; i <= 12; i++) await tocar("touchMove", desde.x + ((hasta.x - desde.x) * i) / 12, desde.y + ((hasta.y - desde.y) * i) / 12);
    await tocar("touchEnd");
    await expect(formas).toHaveCount(11);
  });
});
