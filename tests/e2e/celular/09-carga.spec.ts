import { test, expect } from "@playwright/test";

// Prueba de carga del navegador (issue #18): con 50.000 productos y 10.000 ventas en
// IndexedDB, registrar una venta tarda menos de 50 ms y buscar menos de 100. Es lenta:
// se corre a mano con CARGA=1, idealmente en la laptop del local antes del piloto.
test.skip(!process.env.CARGA, "correr con CARGA=1 tests/e2e.sh --solo carga");

test("carga: 50.000 productos y 10.000 ventas en el navegador", async ({ page }) => {
  await page.goto("/");
  const medidas = await page.evaluate(async () => {
    const abrir = () => new Promise<IDBDatabase>((r, j) => { const p = indexedDB.open("ferre-carga", 1); p.onupgradeneeded = () => { p.result.createObjectStore("catalogo", { keyPath: "id" }); p.result.createObjectStore("ventas", { keyPath: "id" }).createIndex("fecha", "fecha"); }; p.onsuccess = () => r(p.result); p.onerror = () => j(p.error); });
    const db = await abrir();
    const fin = (tx: IDBTransaction) => new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
    const t0 = performance.now();
    let tx = db.transaction("catalogo", "readwrite");
    for (let i = 0; i < 50_000; i++) tx.objectStore("catalogo").put({ id: `p${i}`, descripcion: `PRODUCTO ${i} TORNILLO ${i % 97} MM`, marca: `MARCA ${i % 13}`, costo_neto: String(i % 1000) });
    await fin(tx);
    const cargaCatalogo = performance.now() - t0;
    tx = db.transaction("ventas", "readwrite");
    for (let i = 0; i < 10_000; i++) tx.objectStore("ventas").put({ id: `v${i}`, fecha: new Date(Date.now() - i * 60000).toISOString(), total: i, items: [{ descripcion: "x", cantidad: 1, precio_unitario: i }] });
    await fin(tx);
    // Registrar una venta más, medida sola.
    const t1 = performance.now();
    tx = db.transaction("ventas", "readwrite");
    tx.objectStore("ventas").put({ id: "v-nueva", fecha: new Date().toISOString(), total: 1, items: [] });
    await fin(tx);
    const venta = performance.now() - t1;
    // Leer el catálogo entero a memoria (lo que hace la app al abrir) y buscar.
    const t2 = performance.now();
    const todos = await new Promise<{ descripcion: string; marca: string }[]>((r) => { const q = db.transaction("catalogo").objectStore("catalogo").getAll(); q.onsuccess = () => r(q.result); });
    const lectura = performance.now() - t2;
    const palabras = todos.map((p) => `${p.descripcion} ${p.marca}`.toLowerCase().split(" "));
    const t3 = performance.now();
    const q = ["tornillo", "42", "marca"];
    let encontrados = 0;
    for (const ps of palabras) if (q.every((w) => ps.some((p) => p.startsWith(w)))) encontrados++;
    const busqueda = performance.now() - t3;
    indexedDB.deleteDatabase("ferre-carga");
    return { cargaCatalogo, venta, lectura, busqueda, encontrados };
  });
  console.log(JSON.stringify(medidas));
  expect(medidas.venta).toBeLessThan(50);
  expect(medidas.busqueda).toBeLessThan(100);
});
