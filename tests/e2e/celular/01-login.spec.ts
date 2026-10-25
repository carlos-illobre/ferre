import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { stack } from "../comun/stack";
import { cerrarLasOtrasVentanas, otraVentana } from "../comun/ventanas";

// La API y la base del stack de esta interfaz (comun/stack.ts).
const { psql, psqlAuditoria } = stack("celular");

// Sin sesión se ve el login; con una sesión válida en el dispositivo, la app entra
// directo y el dueño ve la administración. La sesión se siembra en la base sin pasar
// por Google (que no se puede automatizar).
const TOKEN = "token-e2e-dueno";
const EMAIL = "e2e-dueno@ferre.test";

test.beforeAll(() => {
  // Si una corrida anterior se cortó puede haber quedado una huella vinculada.
  psql(`DELETE FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM vinculacion`);
  // El emparejamiento que deja la entrada con el celular, y la foto que se manda con él.
  psql(`DELETE FROM codigo_escaneado WHERE puesto_id IN (SELECT id FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')))`);
  psql(`DELETE FROM puesto WHERE sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')) OR celular_sesion_id IN (SELECT id FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}'))`);
  psql(`DELETE FROM foto_comprobante WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM sesion WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);
  psql(`DELETE FROM usuario WHERE email = '${EMAIL}'`);
  psql(`INSERT INTO usuario (id, email, nombre, rol) VALUES (gen_random_uuid(), '${EMAIL}', 'Dueño E2E', 'dueño')`);
  // Los usuarios de prueba pueden todo: reciben los cinco roles de arranque (RF-72).
  psql(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT u.id, r.id FROM usuario u CROSS JOIN rol r WHERE r.id::text LIKE '00000000-0000-4000-8000-%' AND u.email = '${EMAIL}'`);
  const hash = createHash("sha256").update(TOKEN).digest("hex");
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${hash}', 'e2e', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
});

test.afterEach(cerrarLasOtrasVentanas);

test("sin sesión se pide entrar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("entrar")).toBeVisible();
  // Entrar leyendo un QR se quitó (2026-10-09): se entra con Google o con la huella.
  await expect(page.getByRole("button", { name: /código QR/ })).toHaveCount(0);
});

test("con sesión el dueño entra y ve la administración", async ({ page }) => {
  await page.addInitScript((token) => localStorage.setItem("ferre.sesion.desarrollo", token), TOKEN);
  await page.goto("/");
  // Cómo va el negocio y Usuarios están en la parte Negocio del menú, como la v2 (decisión 149).
  await page.getByTestId("menu-negocio").click();
  await expect(page.getByTestId("usuario-negocio")).toContainText("Dueño E2E");
  await page.getByRole("tab", { name: "Usuarios" }).click();
  await expect(page.getByTestId("autorizar")).toContainText("Autorizar otro correo de Google");
  await expect(page.getByTestId("usuarios")).toContainText(EMAIL);
});

// Passkeys con un autenticador virtual de Chromium (huella simulada): vincular el
// dispositivo desde Administración, salir, y volver a entrar con la huella sin Google.
test("vincular el celular con la huella y volver a entrar con ella", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: { protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true },
  });
  psql(`DELETE FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}')`);

  // Recién entrado con Google (Google no se automatiza: se siembra la sesión y la marca),
  // la app ofrece usar la huella, como en el banco, solo en un celular: se simula el
  // user agent de Android. Aceptar vincula el celular.
  await page.addInitScript((token) => {
    localStorage.setItem("ferre.sesion.desarrollo", token); sessionStorage.setItem("ferre.recien-google", "1");
    Object.defineProperty(navigator, "userAgent", { get: () => "Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome/128.0 Mobile Safari/537.36" });
  }, TOKEN);
  await page.goto("/#/mas/configuracion");
  await expect(page.getByTestId("ofrecer-huella")).toContainText("¿Entrar con la huella?");
  await page.getByTestId("aceptar-huella").click();
  await expect(page.getByTestId("ofrecer-huella")).toContainText("Listo");
  await page.getByRole("button", { name: "Entendido" }).click();
  await expect(page.getByTestId("celular")).toHaveCount(1);
  // No vuelve a ofrecerlo; y desde Configuración se puede quitar y vincular a mano.
  await page.reload();
  await expect(page.getByTestId("ofrecer-huella")).toHaveCount(0);
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("celular").getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByTestId("celular")).toHaveCount(0);
  // El autenticador virtual elige solo la primera clave que tiene (un celular real muestra
  // para elegir): se borra la quitada para que la prueba use la nueva.
  await cdp.send("WebAuthn.clearCredentials", { authenticatorId });
  page.once("dialog", (d) => d.accept("Celular E2E"));
  await page.getByTestId("vincular-celular").click();
  await expect(page.getByTestId("mensaje-celular")).toContainText("«Celular E2E» entra con la huella");
  await expect(page.getByTestId("celular")).toContainText("Celular E2E");
  await expect.poll(() => psql(`SELECT count(*) FROM credencial WHERE usuario_id IN (SELECT id FROM usuario WHERE email = '${EMAIL}') AND revocada_en IS NULL`)).toBe("1");

  // Salir y entrar con la huella: sin Google.
  await page.getByRole("button", { name: "Más", exact: true }).click();
  await page.getByRole("button", { name: /^Salir/ }).click();
  await expect(page.getByTestId("entrar-huella")).toBeVisible();
  await page.getByTestId("entrar-huella").click();
  // Al entrar se abre siempre el Catálogo, no la pantalla desde la que se salió (decisión 56).
  await expect(page.getByTestId("menu-catalogo")).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Más", exact: true }).click();
  await expect(page.getByTestId("usuario")).toContainText("Dueño E2E");
  await expect.poll(() => psqlAuditoria(`SELECT contenido->>'medio' FROM auditoria.evento WHERE tipo = 'sesion.iniciada' AND quien_id = '${psql(`SELECT id FROM usuario WHERE email = '${EMAIL}'`)}' ORDER BY fecha DESC LIMIT 1`)).toBe("huella");

  // Quitar el celular: ya no entra con la huella.
  await page.goto("/#/mas/configuracion");
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("celular").getByRole("button", { name: "Quitar" }).click();
  await expect(page.getByTestId("celular")).toHaveCount(0);
  await page.getByRole("button", { name: "Más", exact: true }).click();
  await page.getByRole("button", { name: /^Salir/ }).click();
  await page.getByTestId("entrar-huella").click();
  await expect(page.getByTestId("error-huella")).toContainText("no está vinculado");
});

// Entrar a la computadora con el celular (RF-76, decisión 57): la entrada de la computadora
// muestra sola un código; el celular lo lee y la computadora entra, sin paso de confirmar.
test("entrar a la computadora leyendo su código con el celular", async ({ browser }) => {
  // Una sesión propia para el celular: las otras pruebas de este archivo cierran la suya.
  const TOKEN_CELULAR = "token-e2e-login-celular";
  psql(`INSERT INTO sesion (id, usuario_id, token_hash, dispositivo, expira_en) SELECT gen_random_uuid(), id, '${createHash("sha256").update(TOKEN_CELULAR).digest("hex")}', 'e2e celular', now() + interval '1 day' FROM usuario WHERE email = '${EMAIL}'`);
  const compu = await otraVentana(browser, { viewport: { width: 1366, height: 768 } });
  await compu.goto("/");
  await expect(compu.getByRole("heading", { name: "Entrá con tu celular" })).toBeVisible();
  await expect(compu.getByTestId("qr-entrar").locator("img")).toBeVisible();
  // Sin una huella vinculada en esta computadora, no se ofrece entrar con la huella.
  await expect(compu.getByTestId("entrar-huella")).toHaveCount(0);
  const enlace = await compu.evaluate(() => (window as unknown as { __enlaceParaEntrar: string }).__enlaceParaEntrar);
  expect(enlace).toContain("#/entrar-compu?codigo=");
  const ruta = enlace.replace(/^https?:\/\/[^/]+/, "");

  // Un celular sin sesión ve la entrada de siempre, que avisa que la computadora entra también.
  const sinSesion = await otraVentana(browser, { viewport: { width: 390, height: 844 } });
  await sinSesion.goto(ruta);
  await expect(sinSesion.getByTestId("entrar-para-la-compu")).toContainText("esa computadora entra también");
  await expect(compu.getByTestId("qr-entrar")).toBeVisible(); // nadie entró todavía
  await sinSesion.context().close();

  // Un celular que ya tenía la sesión: un toque, y la computadora entra sola con ese usuario.
  const celular = await otraVentana(browser, { viewport: { width: 390, height: 844 } });
  await celular.addInitScript((t) => localStorage.setItem("ferre.sesion.desarrollo", t), TOKEN_CELULAR);
  await celular.goto(ruta);
  await celular.getByTestId("dejar-entrar").click();
  // El celular sigue a su pantalla de siempre y lo dice arriba un momento (pedido de Carlos del 2026-10-15).
  await expect(celular.getByTestId("espejo-aviso")).toContainText("Listo: la computadora entró como");
  await expect(compu.getByTestId("usuario")).toContainText("Dueño E2E", { timeout: 10000 });
  await expect.poll(() => psqlAuditoria(`SELECT count(*) FROM auditoria.evento WHERE tipo = 'sesion.iniciada' AND contenido->>'medio' = 'celular' AND quien_id = '${psql(`SELECT id FROM usuario WHERE email = '${EMAIL}'`)}'`)).toBe("1");

  // Quedan emparejados (decisión 58): sin leer más códigos, la computadora ya tiene su celular…
  await expect.poll(() => psql(`SELECT count(*) FROM puesto WHERE vinculado_en IS NOT NULL AND expira_en > now() + interval '29 days' AND celular_sesion_id = (SELECT id FROM sesion WHERE token_hash = '${createHash("sha256").update(TOKEN_CELULAR).digest("hex")}')`), { timeout: 15000 }).toBe("1");
  // …y se espejan enseguida, sin recargar la computadora (antes quedaba «Conectando con el celular…», 007-T020).
  await expect(compu.getByTestId("espejo-estado")).toHaveAttribute("data-conexion", "directa", { timeout: 15000 });
  await compu.goto("/#/vender");
  await expect(compu.getByTestId("celular-vinculado")).toBeVisible();
  // La computadora le pide que haga de lector (decisión 59): al celular le aparece el aviso,
  // abre el lector y lo que lee llega a la venta de la computadora. (Sin cámara en la prueba: se tipea.)
  await compu.getByTestId("pedir-lector").click();
  // En Vender, el botón deja su lugar al aviso «El celular está escaneando» (decisión 122).
  await expect(compu.getByTestId("celular-escaneando")).toBeVisible();
  await celular.getByTestId("abrir-el-lector").click();
  await celular.getByTestId("codigo-manual").fill("7790000000011");
  await celular.getByTestId("codigo-manual").press("Enter");
  // Leído el código, la cámara se cierra sola y el celular dice que llegó.
  await expect(celular.getByTestId("escaner")).toHaveCount(0);
  await expect(celular.getByTestId("lector-resultado")).toContainText("Ya está en la computadora", { timeout: 10000 });
  await expect(compu.getByTestId("codigo-desconocido")).toContainText("7790000000011", { timeout: 10000 });
  await celular.getByRole("button", { name: "Listo" }).click();
  // …y la foto de una factura se la pide sin código: al celular le aparece el aviso.
  await compu.goto("/#/ingreso");
  await compu.getByTestId("foto-con-celular").click();
  await expect(compu.getByTestId("pedida-al-celular")).toBeVisible();
  await expect(celular.getByTestId("pedido-de-la-compu")).toContainText("La computadora pide una foto");
  await celular.getByTestId("sacar-foto-para-la-compu").click();
  await celular.getByTestId("archivo-para-la-compu").setInputFiles({ name: "factura.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
  await expect(compu.getByTestId("foto-comprobante")).toContainText("cargada", { timeout: 15000 });

  // El código sirve una sola vez.
  const otro = await otraVentana(browser, { viewport: { width: 390, height: 844 } });
  await otro.addInitScript((t) => localStorage.setItem("ferre.sesion.desarrollo", t), TOKEN_CELULAR);
  await otro.goto(ruta);
  await otro.getByTestId("dejar-entrar").click();
  await expect(otro.getByTestId("compu-no-entro")).toContainText("Leé el que la computadora muestra ahora");
});

// Lo único de entrar con la cámara que no se prueba con unitarias (007-T041): que el lector de
// la aplicación, en un navegador de verdad, lea el código que muestra la computadora. La cámara
// es de mentira: muestra la imagen del código de la pantalla de la computadora. Lo que pasa
// después de leerlo lo prueban las unitarias.
// @tiempo: decodificar el código del video depende de la carga de la máquina; corre al final, sin
// la otra interfaz a la vez (tests/e2e.sh). Con todo corriendo junto no llegaba a leerlo.
test("C5 la cámara del celular lee el código que muestra la computadora y lleva a dejarla entrar", { tag: "@tiempo" }, async ({ browser, page }) => {
  const compu = await otraVentana(browser, { viewport: { width: 1366, height: 768 } });
  await compu.goto("/");
  const qr = compu.getByTestId("qr-entrar").locator("img");
  await expect(qr).toBeVisible();
  const imagen = (await qr.getAttribute("src"))!;
  const enlace = await compu.evaluate(() => (window as unknown as { __enlaceParaEntrar: string }).__enlaceParaEntrar);

  // La cámara de mentira: un video que muestra el código sobre blanco, como al apuntarle a la pantalla.
  await page.addInitScript((src) => {
    navigator.mediaDevices.getUserMedia = async () => {
      const lienzo = Object.assign(document.createElement("canvas"), { width: 640, height: 480 });
      const ctx = lienzo.getContext("2d")!;
      const img = new Image();
      img.src = src;
      await img.decode();
      const dibujar = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 640, 480); ctx.drawImage(img, 120, 40, 400, 400); };
      dibujar();
      setInterval(dibujar, 100);
      return lienzo.captureStream(10);
    };
    // El escáner puede leer el código y cerrarse antes de que la prueba lo mire: se anota al aparecer.
    new MutationObserver((_, observador) => {
      if (!document.querySelector("[data-testid=escaner]")?.getClientRects().length) return;
      sessionStorage.setItem("e2e.escaner-abierto", "1");
      observador.disconnect();
    }).observe(document, { childList: true, subtree: true });
  }, imagen);
  await page.goto("/");
  await page.getByTestId("escanear-codigo-de-la-compu").click();
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("e2e.escaner-abierto"))).toBe("1");
  await expect(page.getByTestId("entrar-para-la-compu")).toBeVisible({ timeout: 15000 });
  expect(await page.evaluate(() => location.hash)).toBe(enlace.slice(enlace.indexOf("#")));
  await expect(page.getByTestId("escaner")).toHaveCount(0);
});
