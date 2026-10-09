import { test, expect } from "@playwright/test";

// Escenario del esqueleto: la PWA abre y le habla a la API y a la base. Los happy paths
// reales (cargar lista, buscar y vender, ingresar mercadería, contar, ver stock) se
// agregan con sus issues; la lista vive en docs/TESTING.md.
test("la app abre y el servidor responde", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("entrar")).toBeVisible();
  // Sin sesión no hay estado del servidor a la vista: alcanza con que la API responda.
  const salud = await page.request.get("http://localhost/health");
  expect(salud.ok()).toBeTruthy();
});

// La app tiene dos interfaces (ADR-014) y cada una carga solo sus estilos: si se mezclan,
// las clases de una pisan las de la otra. Se ve en el build, no en desarrollo.
test("la interfaz de celular carga una sola hoja de estilos propia", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root > *").first()).toBeVisible();
  const hojas = await page.evaluate(() => [...document.styleSheets].map((h) => h.href ?? "").filter((h) => /\/assets\/.*\.css$/.test(h)));
  expect(hojas).toHaveLength(1);
});
