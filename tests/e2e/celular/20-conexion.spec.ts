import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";
import { cerrarLasOtrasVentanas, otraVentana } from "../comun/ventanas";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { API, psql } = stack("celular");

// Cuando la conexión directa no se puede, el celular y la computadora se hablan por el servidor,
// solos, y el indicador lo dice (specs/023, historias 2 y 3).
const TOKEN_COMPU = "token-e2e-conexion-compu";
const TOKEN_CELULAR = "token-e2e-conexion-celular";
const EMAIL = "e2e-conexion@ferre.test";
const ID_PROV = "00000000-0000-0000-0000-0000000c0e01";
const ID_PROD = "00000000-0000-0000-0000-0000000c0e02";
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const CELULAR = { viewport: { width: 412, height: 915 }, userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36" };

// Un navegador sin conexión directa (E07), o una red que no la deja (E06): las señales salen, pero
// ningún candidato de red, así que el canal nunca abre.
const SIN_DIRECTA = () => { delete (window as { RTCPeerConnection?: unknown }).RTCPeerConnection; };
const RED_QUE_AISLA = () => {
  const Original = window.RTCPeerConnection;
  window.RTCPeerConnection = class extends Original {
    set onicecandidate(_fn: unknown) { super.onicecandidate = null; }
    get onicecandidate() { return null; }
  } as typeof RTCPeerConnection;
};

test.beforeAll(() => {
  const susSesiones = `(SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}'))`;
  psql(`DELETE FROM codigo_escaneado WHERE puesto_id IN (SELECT id FROM puesto WHERE sesion_id IN ${susSesiones} OR celular_sesion_id IN ${susSesiones})`);
  // Lo que dejó la entrada con el código (025-E01): la vinculación apunta a las sesiones.
  psql(`DELETE FROM vinculacion WHERE celular_sesion_id IN ${susSesiones} OR sesion_id IN ${susSesiones}`);
  psql(`DELETE FROM puesto WHERE sesion_id IN ${susSesiones} OR celular_sesion_id IN ${susSesiones}`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre) VALUES (gen_random_uuid(), '${EMAIL}', 'Conexión E2E')`);
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  for (const t of [TOKEN_COMPU, TOKEN_CELULAR]) {
    psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash(t)}', 'e2e ${t}', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  }
  psql(`INSERT INTO puesto (id, sesion_id, codigo_hash, nombre, vinculado_en, celular_sesion_id, expira_en) SELECT gen_random_uuid(), a.id, 'e2e-conexion', 'computadora e2e', now(), b.id, now() + interval '30 days' FROM sesion a, sesion b WHERE a.token_hash = '${hash(TOKEN_COMPU)}' AND b.token_hash = '${hash(TOKEN_CELULAR)}'`);
  psql(`DELETE FROM item_venta WHERE producto_id = '${ID_PROD}'`);
  psql(`DELETE FROM precio_proveedor WHERE proveedor_id = '${ID_PROV}'`);
  psql(`DELETE FROM producto WHERE id = '${ID_PROD}'`);
  psql(`DELETE FROM proveedor WHERE id = '${ID_PROV}'`);
  psql(`INSERT INTO proveedor (id, nombre) VALUES ('${ID_PROV}', 'Proveedor conexión (e2e)')`);
  psql(`INSERT INTO producto (id, descripcion, marca, codigo_barras, margen_elegido) VALUES ('${ID_PROD}', 'TARUGO CONEXION 8 MM (E2E)', 'MARCA E2E', '7790002223334', 100)`);
  psql(`INSERT INTO precio_proveedor (id, producto_id, proveedor_id, codigo_proveedor, precio_lista, descuentos, costo_neto, iva, fecha_lista) VALUES (gen_random_uuid(), '${ID_PROD}', '${ID_PROV}', 'TC8', 1000, '[]', 1000, 0.21, '2026-08-01')`);
});

test.afterEach(cerrarLasOtrasVentanas);

// Abre los dos, cada uno con lo que le falte para la directa, y los deja en Vender.
async function abrirLosDos(browser: import("@playwright/test").Browser, enCadaUno: () => void, antes: (p: Page) => void = () => {}): Promise<{ compu: Page; celular: Page }> {
  const compu = await otraVentana(browser, { viewport: { width: 1366, height: 768 } });
  const celular = await otraVentana(browser, CELULAR);
  for (const [pagina, token] of [[compu, TOKEN_COMPU], [celular, TOKEN_CELULAR]] as const) {
    antes(pagina);
    await pagina.addInitScript((t) => { localStorage.clear(); localStorage.setItem("ferre.sesion.desarrollo", t); }, token);
    await pagina.addInitScript(enCadaUno);
    await pagina.goto("/#/vender");
  }
  return { compu, celular };
}
// El celular, como lector de la computadora, manda un código tipeado (no hay cámara en la prueba).
async function mandarCodigo(celular: Page, codigo: string) {
  await celular.goto("/#/lector");
  const escaner = celular.getByTestId("escaner");
  await escaner.getByTestId("codigo-manual").fill(codigo);
  await escaner.getByTestId("codigo-manual").press("Enter");
  await expect(celular.getByTestId("lector-resultado")).toHaveText("Ya está en la computadora", { timeout: 10000 });
}

test("023-E07 023-E08: si un navegador no tiene la conexión directa, van por el servidor enseguida y el lector anda igual", async ({ browser }) => {
  const { compu, celular } = await abrirLosDos(browser, SIN_DIRECTA);
  for (const p of [compu, celular]) await expect(p.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "servidor", { timeout: 4000 });
  await compu.getByTestId("indicador-vinculo").click();
  await expect(compu.getByTestId("por-que-servidor")).toContainText("Este navegador no permite la conexión directa");
  await compu.getByTestId("cerrar-detalle").click();
  await mandarCodigo(celular, "7790002223334");
  await expect(compu.getByTestId("item").filter({ hasText: "TARUGO CONEXION" })).toBeVisible({ timeout: 10000 });
});

test("023-E06 023-E09 023-E22: si la red no deja, a los 5 segundos van por el servidor; no se vuelve a probar sola; se prueba a mano", async ({ browser }) => {
  test.setTimeout(60_000);
  const { compu, celular } = await abrirLosDos(browser, RED_QUE_AISLA);
  for (const p of [compu, celular]) await expect(p.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "servidor", { timeout: 9000 });
  await celular.getByTestId("indicador-vinculo").click();
  await expect(celular.getByTestId("por-que-servidor")).toContainText("no deja conectar directo");
  await celular.getByTestId("cerrar-detalle").click();
  // Al volver a abrir la computadora, va directo por el servidor: no prueba de nuevo (023-E09).
  await compu.reload();
  await expect(compu.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "servidor", { timeout: 4000 });
  // «Probar conexión directa»: la prueba una vez; con la red que sigue aislando, vuelve al servidor (023-E22).
  await compu.getByTestId("indicador-vinculo").click();
  await compu.getByTestId("probar-directa").click();
  await expect(compu.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "conectando");
  await expect(compu.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "servidor", { timeout: 9000 });
  await expect(compu.getByTestId("por-que-servidor")).toContainText("Se probó hoy");
});

// Los canales abiertos de una página con el servidor (specs/025): los que empezó y todavía no terminaron.
function canalesAbiertos(pagina: Page) {
  const abiertos = new Set<unknown>();
  pagina.on("request", (r) => { if (r.method() === "GET" && new URL(r.url()).pathname === "/canal") abiertos.add(r); });
  pagina.on("requestfailed", (r) => abiertos.delete(r));
  pagina.on("requestfinished", (r) => abiertos.delete(r));
  return () => abiertos.size;
}

test("025-E21: armada la directa, los dos dejan el canal con el servidor y siguen hablándose", async ({ browser }) => {
  const abiertos: Array<() => number> = [];
  const { compu, celular } = await abrirLosDos(browser, () => {}, (p) => abiertos.push(canalesAbiertos(p)));
  for (const p of [compu, celular]) await expect(p.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "directa", { timeout: 15000 });
  await expect.poll(() => abiertos.map((n) => n())).toEqual([0, 0]);
  await mandarCodigo(celular, "7790002223334");
  await expect(compu.getByTestId("item").filter({ hasText: "TARUGO CONEXION" })).toBeVisible({ timeout: 10000 });
});

// Va al final: entrar con el código empareja al celular con esta computadora y suelta el vínculo de
// las pruebas de arriba (decisión 58).
test("025-E01 025-E03 025-E12: la entrada con el código espera por un solo canal, sin preguntar; al aprobar, entra enseguida", async ({ browser }) => {
  const compu = await otraVentana(browser, { viewport: { width: 1366, height: 768 } });
  const pedidos: string[] = [];
  compu.on("request", (r) => { if (r.url().startsWith(API)) pedidos.push(new URL(r.url()).pathname); });
  await compu.goto("/");
  await expect(compu.getByTestId("qr-entrar").locator("img")).toBeVisible();
  await expect(compu.getByTestId("entrar-conexion")).toHaveText("En línea");
  // Un rato con el código en pantalla: un solo canal y ninguna pregunta (ni el estado del código ni la salud).
  await compu.waitForTimeout(6000);
  expect(pedidos.filter((p) => p === "/canal")).toHaveLength(1);
  expect(pedidos.filter((p) => p.endsWith("/estado") || p === "/health")).toEqual([]);
  const enlace = await compu.evaluate(() => (window as unknown as { __enlaceParaEntrar: string }).__enlaceParaEntrar);
  const codigo = new URL(enlace.replace("#/entrar-compu", "")).searchParams.get("codigo")!;
  const aprobada = await compu.request.post(`${API}/sesiones/vinculaciones/aprobar`, { headers: { Authorization: `Bearer ${TOKEN_CELULAR}` }, data: { codigo } });
  expect(aprobada.ok()).toBe(true);
  await expect(compu.getByTestId("usuario")).toContainText("Conexión E2E", { timeout: 3000 });
  expect(pedidos.filter((p) => p.endsWith("/estado"))).toHaveLength(1);
});
