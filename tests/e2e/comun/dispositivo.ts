import type { Page } from "@playwright/test";

// Lo que la aplicación guarda en el navegador, para esperar a que pase algo en vez de esperar
// un tiempo fijo.

// Cuántos cambios hay en la cola del dispositivo: lo que se anotó para mandar al servidor y
// todavía no salió (la base local «ferre», almacén «cola»; la abre la aplicación).
export function cambiosEnLaCola(page: Page): Promise<number> {
  return page.evaluate(() => new Promise<number>((ok, mal) => {
    const pedido = indexedDB.open("ferre.desarrollo");
    pedido.onerror = () => mal(pedido.error);
    pedido.onsuccess = () => {
      const base = pedido.result;
      const cuenta = base.transaction("cola").objectStore("cola").count();
      cuenta.onsuccess = () => { ok(cuenta.result); base.close(); };
      cuenta.onerror = () => { mal(cuenta.error); base.close(); };
    };
  }));
}

// Cuántos de los scripts y estilos que usó la página todavía no están en la caché del service
// worker: en 0, la aplicación ya puede abrir sin red.
export function archivosSinCachear(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const usados = performance.getEntriesByType("resource").map((r) => r.name)
      .filter((url) => url.startsWith(location.origin) && /\.(js|css)$/.test(new URL(url).pathname));
    let faltan = 0;
    for (const url of usados) if (!(await caches.match(url, { ignoreSearch: true }))) faltan++;
    return faltan;
  });
}
