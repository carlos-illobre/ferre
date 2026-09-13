import { test, expect } from "@playwright/test";

// Escenario del esqueleto: la PWA abre y le habla a la API y a la base. Los happy paths
// reales (cargar lista, buscar y vender, ingresar mercadería, contar, ver stock) se
// agregan con sus issues; la lista vive en docs/TESTING.md.
test("la app abre y el servidor responde", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ferre" })).toBeVisible();
  await expect(page.getByTestId("estado")).toContainText("Servidor ok · base ok");
});
