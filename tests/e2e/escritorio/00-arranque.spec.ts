import { test, expect } from "@playwright/test";

// La API del stack contra el que corren los escenarios (API_URL permite otro puerto).
const API = process.env.API_URL ?? "http://localhost";

// Escenario del esqueleto: la PWA abre y le habla a la API y a la base. Los happy paths
// reales (cargar lista, buscar y vender, ingresar mercadería, contar, ver stock) se
// agregan con sus issues; la lista vive en specs/001-base-del-sistema/quickstart.md.
test("la app abre y el servidor responde", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ferre" })).toBeVisible();
  // Sin sesión no hay estado del servidor a la vista: alcanza con que la API responda.
  const salud = await page.request.get(`${API}/health`);
  expect(salud.ok()).toBeTruthy();
});

// La app tiene dos interfaces (ADR-014 y ADR-015) que se eligen por el ancho: en una pantalla
// de computadora se arma la de la computadora (menú al costado) y no la del celular.
test("en una computadora se carga la interfaz de computadora y no la de celular", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#root > *").first()).toBeVisible();
  await expect(page.locator(".nav-inferior")).toHaveCount(0);
  // El ambiente de prueba se anuncia con su marco y su cartel (decisión 33).
  await expect(page.getByTestId("ambiente")).toContainText("nada de esto es real");
});

test("las direcciones viejas siguen andando: /v5/ lleva a la raíz y /v1/ a su versión histórica", async ({ page }) => {
  await page.goto("/v5/#/vender");
  await expect(page).toHaveURL(/:\d+\/#\/vender$/);
  await page.goto("/v1/");
  await expect(page).toHaveURL(/\/historico\/v1\//);
  await expect(page.getByText("Versión histórica: no se usa.")).toBeVisible();
});
