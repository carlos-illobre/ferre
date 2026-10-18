import type { Browser, BrowserContext, BrowserContextOptions, Page } from "@playwright/test";

// Las ventanas que abre una prueba además de la suya (otra computadora, otro celular). Playwright
// cierra sola la ventana de la prueba, pero no estas: seguían abiertas, preguntando al servidor y
// conectadas al espejo, hasta el final de la tanda, y hacían más lentas a las pruebas que venían
// después. Cada archivo que las usa las cierra al terminar cada prueba, haya pasado o no:
//   test.afterEach(cerrarLasOtrasVentanas);
const abiertas = new Set<BrowserContext>();

export async function otroContexto(browser: Browser, opciones?: BrowserContextOptions): Promise<BrowserContext> {
  const contexto = await browser.newContext(opciones);
  abiertas.add(contexto);
  contexto.on("close", () => abiertas.delete(contexto));
  return contexto;
}

export async function otraVentana(browser: Browser, opciones?: BrowserContextOptions): Promise<Page> {
  return (await otroContexto(browser, opciones)).newPage();
}

export async function cerrarLasOtrasVentanas(): Promise<void> {
  await Promise.all([...abiertas].map((c) => c.close()));
}
