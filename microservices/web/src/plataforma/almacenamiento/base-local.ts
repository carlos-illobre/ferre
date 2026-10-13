// Una base local del navegador (IndexedDB) con un envoltorio mínimo: promesas, almacenes con
// nombre y ninguna dependencia. Sirve para cualquier aplicación: quien la usa dice cómo se
// llama la base, qué almacenes tiene y, si quiere, cuándo está habilitada.
//
// Regla del envoltorio: nunca se espera algo ajeno a IndexedDB dentro de una transacción,
// porque la transacción se cierra sola y la operación falla con un error confuso.
export type DefinicionDeAlmacen<A extends string = string> = { nombre: A; clave: string; indices?: readonly string[] };
export type OpcionesDeBaseLocal<A extends string> = {
  nombre: string;
  version: number;
  almacenes: readonly DefinicionDeAlmacen<A>[];
  // Si devuelve falso, la base no se abre: toda operación falla, como en un navegador sin
  // IndexedDB, y quien la usa sigue sin ella. Sin esta función, está siempre habilitada.
  habilitada?: () => boolean;
};

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

export function crearBaseLocal<A extends string>(opciones: OpcionesDeBaseLocal<A>) {
  let abierta: Promise<IDBDatabase> | null = null;

  function abrir(): Promise<IDBDatabase> {
    if (opciones.habilitada && !opciones.habilitada()) return Promise.reject(new Error("La base local está deshabilitada en este dispositivo"));
    if (abierta) return abierta;
    abierta = new Promise((resolver, rechazar) => {
      if (typeof indexedDB === "undefined") return rechazar(new Error("Este navegador no tiene IndexedDB"));
      const pedido = indexedDB.open(opciones.nombre, opciones.version);
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        for (const a of opciones.almacenes) {
          if (db.objectStoreNames.contains(a.nombre)) continue;
          const almacen = db.createObjectStore(a.nombre, { keyPath: a.clave });
          for (const indice of a.indices ?? []) almacen.createIndex(indice, indice);
        }
      };
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rechazar(pedido.error ?? new Error("No se pudo abrir la base local"));
      pedido.onblocked = () => rechazar(new Error("La base local está bloqueada por otra pestaña"));
    });
    abierta.catch(() => { abierta = null; });
    return abierta;
  }

  // Borra la base entera del dispositivo.
  async function borrarTodo(): Promise<void> {
    const anterior = abierta;
    abierta = null;
    if (anterior) await anterior.then((db) => db.close()).catch(() => undefined);
    if (typeof indexedDB === "undefined") return;
    await new Promise<void>((listo) => {
      const pedido = indexedDB.deleteDatabase(opciones.nombre);
      pedido.onsuccess = pedido.onerror = pedido.onblocked = () => listo();
    });
  }

  async function leer<T>(almacen: A, clave: IDBValidKey): Promise<T | undefined> {
    const db = await abrir();
    return esperar(db.transaction(almacen, "readonly").objectStore(almacen).get(clave)) as Promise<T | undefined>;
  }

  async function leerTodo<T>(almacen: A): Promise<T[]> {
    const db = await abrir();
    return esperar(db.transaction(almacen, "readonly").objectStore(almacen).getAll()) as Promise<T[]>;
  }

  async function guardar<T>(almacen: A, valor: T): Promise<void> {
    const db = await abrir();
    const tx = db.transaction(almacen, "readwrite");
    tx.objectStore(almacen).put(valor);
    await terminada(tx);
  }

  // Reemplaza todo el contenido de un almacén. Miles de filas en una sola transacción: milisegundos.
  async function reemplazarTodo<T>(almacen: A, valores: T[]): Promise<void> {
    const db = await abrir();
    const tx = db.transaction(almacen, "readwrite");
    const store = tx.objectStore(almacen);
    store.clear();
    for (const v of valores) store.put(v);
    await terminada(tx);
  }

  async function borrar(almacen: A, clave: IDBValidKey): Promise<void> {
    const db = await abrir();
    const tx = db.transaction(almacen, "readwrite");
    tx.objectStore(almacen).delete(clave);
    await terminada(tx);
  }

  // Borra lo que, según un índice, es anterior a un límite. Devuelve cuántos borró.
  async function borrarAnterioresA(almacen: A, indice: string, limite: IDBValidKey): Promise<number> {
    const db = await abrir();
    const tx = db.transaction(almacen, "readwrite");
    const claves = await esperar(tx.objectStore(almacen).index(indice).getAllKeys(IDBKeyRange.upperBound(limite, true)));
    for (const k of claves) tx.objectStore(almacen).delete(k);
    await terminada(tx);
    return claves.length;
  }

  async function contar(almacen: A): Promise<number> {
    const db = await abrir();
    return esperar(db.transaction(almacen, "readonly").objectStore(almacen).count());
  }

  return { abrir, borrarTodo, leer, leerTodo, guardar, reemplazarTodo, borrar, borrarAnterioresA, contar };
}
