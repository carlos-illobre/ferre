// IndexedDB con un envoltorio propio (ADR-005): promesas, almacenes tipados y ninguna
// dependencia. Lo que el mostrador necesita sin conexión vive acá: catálogo, stock,
// clientes, ventas de los últimos 7 días y la cola de cambios pendientes.
//
// Regla del envoltorio: nunca se espera algo ajeno a IndexedDB dentro de una transacción,
// porque la transacción se cierra sola y la operación falla con un error confuso.

const NOMBRE = "ferre";
const VERSION = 1;
export type Almacen = "catalogo" | "stock" | "clientes" | "ventas" | "cola" | "meta";

let baseAbierta: Promise<IDBDatabase> | null = null;

export function abrirBase(): Promise<IDBDatabase> {
  if (baseAbierta) return baseAbierta;
  baseAbierta = new Promise((resolver, rechazar) => {
    if (typeof indexedDB === "undefined") return rechazar(new Error("Este navegador no tiene IndexedDB"));
    const pedido = indexedDB.open(NOMBRE, VERSION);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains("catalogo")) db.createObjectStore("catalogo", { keyPath: "id" });
      if (!db.objectStoreNames.contains("stock")) db.createObjectStore("stock", { keyPath: "id" });
      if (!db.objectStoreNames.contains("clientes")) db.createObjectStore("clientes", { keyPath: "id" });
      if (!db.objectStoreNames.contains("ventas")) db.createObjectStore("ventas", { keyPath: "id" }).createIndex("fecha", "fecha");
      if (!db.objectStoreNames.contains("cola")) db.createObjectStore("cola", { keyPath: "orden" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "clave" });
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error ?? new Error("No se pudo abrir la base local"));
    pedido.onblocked = () => rechazar(new Error("La base local está bloqueada por otra pestaña"));
  });
  baseAbierta.catch(() => { baseAbierta = null; });
  return baseAbierta;
}

function esperar<T>(pedido: IDBRequest<T>): Promise<T> {
  return new Promise((resolver, rechazar) => {
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error ?? new Error("Operación fallida en la base local"));
  });
}

function terminada(tx: IDBTransaction): Promise<void> {
  return new Promise((resolver, rechazar) => {
    tx.oncomplete = () => resolver();
    tx.onerror = () => rechazar(tx.error ?? new Error("Transacción fallida en la base local"));
    tx.onabort = () => rechazar(tx.error ?? new Error("Transacción abortada en la base local"));
  });
}

export async function leer<T>(almacen: Almacen, clave: IDBValidKey): Promise<T | undefined> {
  const db = await abrirBase();
  return esperar(db.transaction(almacen, "readonly").objectStore(almacen).get(clave)) as Promise<T | undefined>;
}

export async function leerTodo<T>(almacen: Almacen): Promise<T[]> {
  const db = await abrirBase();
  return esperar(db.transaction(almacen, "readonly").objectStore(almacen).getAll()) as Promise<T[]>;
}

export async function guardar<T>(almacen: Almacen, valor: T): Promise<void> {
  const db = await abrirBase();
  const tx = db.transaction(almacen, "readwrite");
  tx.objectStore(almacen).put(valor);
  await terminada(tx);
}

// Reemplaza todo el contenido de un almacén (catálogo bajado entero). Miles de filas en
// una sola transacción: milisegundos.
export async function reemplazarTodo<T>(almacen: Almacen, valores: T[]): Promise<void> {
  const db = await abrirBase();
  const tx = db.transaction(almacen, "readwrite");
  const store = tx.objectStore(almacen);
  store.clear();
  for (const v of valores) store.put(v);
  await terminada(tx);
}

export async function borrar(almacen: Almacen, clave: IDBValidKey): Promise<void> {
  const db = await abrirBase();
  const tx = db.transaction(almacen, "readwrite");
  tx.objectStore(almacen).delete(clave);
  await terminada(tx);
}

export async function borrarAnterioresA(almacen: "ventas", indice: "fecha", limite: string): Promise<number> {
  const db = await abrirBase();
  const tx = db.transaction(almacen, "readwrite");
  const claves = await esperar(tx.objectStore(almacen).index(indice).getAllKeys(IDBKeyRange.upperBound(limite, true)));
  for (const k of claves) tx.objectStore(almacen).delete(k);
  await terminada(tx);
  return claves.length;
}

export async function contar(almacen: Almacen): Promise<number> {
  const db = await abrirBase();
  return esperar(db.transaction(almacen, "readonly").objectStore(almacen).count());
}

export async function leerMeta<T>(clave: string): Promise<T | undefined> {
  const fila = await leer<{ clave: string; valor: T }>("meta", clave);
  return fila?.valor;
}
export function guardarMeta<T>(clave: string, valor: T): Promise<void> {
  return guardar("meta", { clave, valor });
}
