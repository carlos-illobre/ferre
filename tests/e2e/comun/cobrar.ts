import type { Page } from "@playwright/test";

// Cobrar en el celular: el círculo del botón se arrastra hasta el final (decisión 119); un toque
// solo no cobra.
export async function deslizarParaCobrar(page: Page): Promise<void> {
  const pulgar = page.getByTestId("cobrar-pulgar");
  await pulgar.scrollIntoViewIfNeeded();
  const p = (await pulgar.boundingBox())!;
  const caja = (await page.getByTestId("cobrar").boundingBox())!;
  const y = p.y + p.height / 2;
  await page.mouse.move(p.x + p.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width - 4, y, { steps: 12 });
  await page.mouse.up();
}

// Buscar en Vender del celular: la búsqueda está en una hoja, como la v2 (decisión 140); tocar la
// caja la abre. Devuelve la caja de la hoja, con lo escrito.
export async function buscarEnVender(page: Page, texto: string) {
  const caja = page.getByTestId("busqueda");
  if (!(await caja.isVisible())) await page.getByTestId("abrir-busqueda").click();
  await caja.fill(texto);
  return caja;
}
