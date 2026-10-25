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

function crearAlmacenes(db: IDBDatabase, almacenes: readonly DefinicionDeAlmacen[]): void {
  for (const a of almacenes) {
    if (db.objectStoreNames.contains(a.nombre)) continue;
    const almacen = db.createObjectStore(a.nombre, { keyPath: a.clave });
    for (const indice of a.indices ?? []) almacen.createIndex(indice, indice);
  }
}

function abrirBase<A extends string>(opciones: OpcionesDeBaseLocal<A>): Promise<IDBDatabase> {
  return new Promise((resolver, rechazar) => {
    if (typeof indexedDB === "undefined") return rechazar(new Error("Este navegador no tiene IndexedDB"));
    const pedido = indexedDB.open(opciones.nombre, opciones.version);
    pedido.onupgradeneeded = () => crearAlmacenes(pedido.result, opciones.almacenes);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error ?? new Error("No se pudo abrir la base local"));
    pedido.onblocked = () => rechazar(new Error("La base local está bloqueada por otra pestaña"));
  });
}

class BaseLocal<A extends string> {
  private abierta: Promise<IDBDatabase> | null = null;
  constructor(private opciones: OpcionesDeBaseLocal<A>) {}

  abrir = (): Promise<IDBDatabase> => {
    if (this.opciones.habilitada && !this.opciones.habilitada()) return Promise.reject(new Error("La base local está deshabilitada en este dispositivo"));
    if (this.abierta) return this.abierta;
    this.abierta = abrirBase(this.opciones);
    this.abierta.catch(() => { this.abierta = null; });
    return this.abierta;
  };

  // Borra la base entera del dispositivo.
  borrarTodo = async (): Promise<void> => {
    const anterior = this.abierta;
    this.abierta = null;
    if (anterior) await anterior.then((db) => db.close()).catch(() => undefined);
    if (typeof indexedDB === "undefined") return;
    await new Promise<void>((listo) => {
      const pedido = indexedDB.deleteDatabase(this.opciones.nombre);
      pedido.onsuccess = pedido.onerror = pedido.onblocked = () => listo();
    });
  };

  private paraLeer = async (almacen: A) => (await this.abrir()).transaction(almacen, "readonly").objectStore(almacen);
  leer = async <T>(almacen: A, clave: IDBValidKey): Promise<T | undefined> => esperar((await this.paraLeer(almacen)).get(clave)) as Promise<T | undefined>;
  leerTodo = async <T>(almacen: A): Promise<T[]> => esperar((await this.paraLeer(almacen)).getAll()) as Promise<T[]>;
  contar = async (almacen: A): Promise<number> => esperar((await this.paraLeer(almacen)).count());

  // Una escritura en un almacén, en una sola transacción.
  private escribir = async <R>(almacen: A, hacer: (store: IDBObjectStore) => R | Promise<R>): Promise<R> => {
    const db = await this.abrir();
    const tx = db.transaction(almacen, "readwrite");
    const resultado = await hacer(tx.objectStore(almacen));
    await terminada(tx);
    return resultado;
  };

  guardar = <T>(almacen: A, valor: T): Promise<void> => this.escribir(almacen, (store) => { store.put(valor); });

  // Reemplaza todo el contenido de un almacén. Miles de filas en una sola transacción: milisegundos.
  reemplazarTodo = <T>(almacen: A, valores: T[]): Promise<void> => this.escribir(almacen, (store) => {
    store.clear();
    for (const v of valores) store.put(v);
  });

  // Muchos de una vez, en una sola transacción: los que vienen se guardan (pisan al que tenga la
  // misma clave) y los de `quitar` se borran.
  guardarVarios = <T>(almacen: A, valores: T[], quitar: IDBValidKey[] = []): Promise<void> => this.escribir(almacen, (store) => {
    for (const v of valores) store.put(v);
    for (const k of quitar) store.delete(k);
  });

  borrar = (almacen: A, clave: IDBValidKey): Promise<void> => this.escribir(almacen, (store) => { store.delete(clave); });

  // Borra lo que, según un índice, es anterior a un límite. Devuelve cuántos borró.
  borrarAnterioresA = (almacen: A, indice: string, limite: IDBValidKey): Promise<number> => this.escribir(almacen, async (store) => {
    const claves = await esperar(store.index(indice).getAllKeys(IDBKeyRange.upperBound(limite, true)));
    for (const k of claves) store.delete(k);
    return claves.length;
  });
}

export type BaseLocalDeAlmacenes<A extends string> = Pick<BaseLocal<A>, "abrir" | "borrarTodo" | "leer" | "leerTodo" | "guardar" | "guardarVarios" | "reemplazarTodo" | "borrar" | "borrarAnterioresA" | "contar">;
export const crearBaseLocal = <A extends string>(opciones: OpcionesDeBaseLocal<A>): BaseLocalDeAlmacenes<A> => new BaseLocal(opciones);
