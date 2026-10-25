import type { Cambio, CambioNuevo, OpcionesDeCola } from "./cambio";

export type { Cambio, OpcionesDeCola } from "./cambio";

const terminada = (tx: IDBTransaction) => new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
const leerTodos = (almacen: IDBObjectStore) => new Promise<Cambio[]>((r, j) => { const q = almacen.getAll(); q.onsuccess = () => r(q.result as Cambio[]); q.onerror = () => j(q.error); });
const porOrden = (a: Cambio, b: Cambio) => a.orden - b.orden;
// Un 4xx (salvo 401 y 429) es un cambio inválido que reintentar no arregla.
const esRechazo = (estado: number | undefined) => Boolean(estado && estado >= 400 && estado < 500 && estado !== 401 && estado !== 429);

class Cola {
  private oyentes = new Set<() => void>();
  // El orden es creciente aunque dos cambios entren en el mismo milisegundo.
  private ultimoOrden = 0;
  // Cambios que el servidor rechazó (4xx) mientras se drenaba la cola, para que quien los pidió vea el error.
  private rechazados = new Map<number, Error>();
  private drenaje: Promise<number> | null = null;

  constructor(private opciones: OpcionesDeCola) {}

  private avisar = () => this.oyentes.forEach((o) => o());
  alCambiar = (oyente: () => void): (() => void) => {
    this.oyentes.add(oyente);
    return () => this.oyentes.delete(oyente);
  };

  // Sin base en el dispositivo no hay nada esperando.
  private todos = async (): Promise<Cambio[]> => {
    const { abrirBase, almacen } = this.opciones;
    const lista = await abrirBase().then((db) => leerTodos(db.transaction(almacen, "readonly").objectStore(almacen))).catch(() => [] as Cambio[]);
    return lista.sort(porOrden);
  };
  private esDeQuienEsta = (c: Cambio) => c.autor === undefined || !this.opciones.autor || c.autor === this.opciones.autor();
  // Lo que espera para salir con la sesión de ahora.
  pendientes = async (): Promise<Cambio[]> => (await this.todos()).filter(this.esDeQuienEsta);
  // Lo que dejó otra persona sin mandar: queda guardado y no sale con esta sesión.
  apartados = async (): Promise<Cambio[]> => (await this.todos()).filter((c) => !this.esDeQuienEsta(c));
  private siguienteOrden = () => (this.ultimoOrden = Math.max(Date.now() * 1000, this.ultimoOrden + 1));

  // Un cambio nuevo puede reemplazar a los anteriores del mismo tipo y ruta: se funden los cuerpos y se sacan los viejos.
  private fundir = async (almacen: IDBObjectStore, cambio: CambioNuevo): Promise<unknown> => {
    let cuerpo = cambio.cuerpo;
    const existentes = await leerTodos(almacen);
    for (const viejo of existentes.filter((c) => c.tipo === cambio.tipo && c.ruta === cambio.ruta && this.esDeQuienEsta(c)).sort(porOrden)) {
      cuerpo = { ...(viejo.cuerpo as object), ...(cuerpo as object) };
      almacen.delete(viejo.orden);
    }
    return cuerpo;
  };

  private encolar = async (cambio: CambioNuevo): Promise<number> => {
    const db = await this.opciones.abrirBase();
    const tx = db.transaction(this.opciones.almacen, "readwrite");
    const almacen = tx.objectStore(this.opciones.almacen);
    const orden = this.siguienteOrden();
    const cuerpo = this.opciones.seFunde?.(cambio) ? await this.fundir(almacen, cambio) : cambio.cuerpo;
    const autor = this.opciones.autor?.() ?? undefined;
    almacen.put({ ...cambio, cuerpo, orden, creado_en: new Date().toISOString(), ...(autor ? { autor } : {}) });
    await terminada(tx);
    this.avisar();
    return orden;
  };

  // Manda un cambio. Devuelve falso si hubo un corte de red: ahí se detiene el drenaje. Un
  // rechazo del servidor se descarta y se registra.
  private mandarUno = async (cambio: Cambio): Promise<boolean> => {
    try { await this.opciones.enviar(cambio); return true; }
    catch (e) {
      if (!esRechazo(this.opciones.estadoDe(e))) return false;
      console.error("cambio pendiente rechazado por el servidor; se descarta", cambio, e);
      this.rechazados.set(cambio.orden, e as Error);
      return true;
    }
  };

  // Manda la lista en orden y saca de la cola lo que salió. Devuelve si se cortó la red.
  private mandarLista = async (db: IDBDatabase, lista: Cambio[]): Promise<boolean> => {
    for (const cambio of lista) {
      if (!(await this.mandarUno(cambio))) return true;
      const tx = db.transaction(this.opciones.almacen, "readwrite");
      tx.objectStore(this.opciones.almacen).delete(cambio.orden);
      await terminada(tx);
      await this.opciones.alEnviar?.();
      this.avisar();
    }
    return false;
  };

  private drenar = async (): Promise<number> => {
    const db = await this.opciones.abrirBase();
    for (let lista = await this.pendientes(); lista.length > 0; lista = await this.pendientes()) {
      if (await this.mandarLista(db, lista)) break;
    }
    const quedan = (await this.pendientes()).length;
    this.avisar();
    return quedan;
  };

  // Reenvía en orden, un solo drenaje a la vez, hasta vaciar la cola. Se detiene en el primer
  // error de red; un 4xx (salvo 401 y 429) se descarta y se registra.
  enviarPendientes = (): Promise<number> => {
    if (this.drenaje) return this.drenaje;
    this.drenaje = this.drenar().finally(() => { this.drenaje = null; });
    return this.drenaje;
  };

  // Sin base local, el cambio se manda directo.
  private enviarDirecto = async (cambio: CambioNuevo): Promise<{ encolado: boolean }> => {
    try { await this.opciones.enviar(cambio); }
    catch (e) { throw this.opciones.errorSinBase ? this.opciones.errorSinBase(e) : e; }
    return { encolado: false };
  };

  // Primero se guarda en la cola y recién después se manda, en orden con lo que ya estaba: si
  // la persona recarga la pantalla o cierra la pestaña con el pedido en vuelo, el cambio no se
  // pierde, y dos cambios seguidos nunca llegan al revés. Con red, sale al instante y se saca
  // de la cola. Devuelve si quedó encolado (sin red).
  enviarOEncolar = async (tipo: string, metodo: Cambio["metodo"], ruta: string, cuerpo: unknown): Promise<{ encolado: boolean }> => {
    const orden = await this.encolar({ tipo, metodo, ruta, cuerpo }).catch(() => null);
    if (orden === null) return this.enviarDirecto({ tipo, metodo, ruta, cuerpo });
    await this.enviarPendientes();
    const rechazo = this.rechazados.get(orden);
    if (rechazo) { this.rechazados.delete(orden); throw rechazo; }
    return { encolado: (await this.pendientes()).some((c) => c.orden === orden) };
  };

  // Los cambios de una persona, para sacarlos del dispositivo por otro camino, y sacarlos.
  deAutor = async (autor: string): Promise<Cambio[]> => (await this.todos()).filter((c) => c.autor === autor);
  quitar = async (ordenes: number[]): Promise<void> => {
    const db = await this.opciones.abrirBase();
    const tx = db.transaction(this.opciones.almacen, "readwrite");
    for (const orden of ordenes) tx.objectStore(this.opciones.almacen).delete(orden);
    await terminada(tx);
    this.avisar();
  };
}

export type ColaDeCambios = Pick<Cola, "alCambiar" | "pendientes" | "apartados" | "deAutor" | "quitar" | "enviarPendientes" | "enviarOEncolar">;
export const crearCola = (opciones: OpcionesDeCola): ColaDeCambios => new Cola(opciones);
