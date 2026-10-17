// Una cola de cambios hechos sin conexión. Cada cambio es un pedido completo (método, ruta y
// cuerpo) que se guarda primero en el dispositivo y se manda en orden; lo que no sale por un
// corte de red queda esperando y se reenvía al reconectar. Sirve para cualquier aplicación:
// quien la usa dice dónde se guarda, cómo se manda un cambio y, si quiere, cómo se funden dos
// cambios del mismo tipo. Los identificadores los pone quien crea el cambio, así reenviar no duplica.
// `autor` es quien lo hizo: un cambio sale solo con la sesión de esa persona (los guardados antes
// de que existiera el dato no lo tienen y salen con cualquiera, como hasta entonces).
export type Cambio = { orden: number; creado_en: string; tipo: string; metodo: "POST" | "PUT" | "PATCH" | "DELETE"; ruta: string; cuerpo: unknown; autor?: string };
type CambioNuevo = Omit<Cambio, "orden" | "creado_en" | "autor">;

export type OpcionesDeCola = {
  // La base local donde vive la cola y el nombre de su almacén (con la clave `orden`).
  abrirBase: () => Promise<IDBDatabase>;
  almacen: string;
  // Manda un cambio al servidor. Si falla, tira un error.
  enviar: (cambio: CambioNuevo) => Promise<void>;
  // El código de estado de un error del servidor, o nada si fue un corte de red.
  estadoDe: (error: unknown) => number | undefined;
  // Un cambio nuevo puede reemplazar a los anteriores del mismo tipo y ruta que sigan en la
  // cola, fundiendo los cuerpos: así nunca se reenvía un valor viejo después de uno nuevo.
  seFunde?: (cambio: CambioNuevo) => boolean;
  // Quién hace los cambios ahora (el usuario de la sesión), o nada sin sesión. Cada cambio se
  // guarda a su nombre y sale solo con su sesión: si entra otra persona en el dispositivo, lo
  // que dejó la anterior sin mandar queda apartado, no se manda a nombre de la nueva.
  autor?: () => string | null;
  // Después de cada cambio que salió.
  alEnviar?: () => Promise<void> | void;
  // Sin base local (un navegador sin IndexedDB, o guardado deshabilitado) el cambio se manda
  // directo. Si ese envío falla, este es el error que ve quien lo pidió.
  errorSinBase?: (error: unknown) => unknown;
};

export function crearCola(opciones: OpcionesDeCola) {
  const oyentes = new Set<() => void>();
  const avisar = () => oyentes.forEach((o) => o());
  function alCambiar(oyente: () => void): () => void {
    oyentes.add(oyente);
    return () => oyentes.delete(oyente);
  }

  const terminada = (tx: IDBTransaction) => new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });

  // Sin base en el dispositivo no hay nada esperando.
  async function todos(): Promise<Cambio[]> {
    const lista = await opciones.abrirBase()
      .then((db) => new Promise<Cambio[]>((r, j) => { const q = db.transaction(opciones.almacen, "readonly").objectStore(opciones.almacen).getAll(); q.onsuccess = () => r(q.result as Cambio[]); q.onerror = () => j(q.error); }))
      .catch(() => [] as Cambio[]);
    return lista.sort((a, b) => a.orden - b.orden);
  }
  const esDeQuienEsta = (c: Cambio) => c.autor === undefined || !opciones.autor || c.autor === opciones.autor();
  // Lo que espera para salir con la sesión de ahora.
  const pendientes = async (): Promise<Cambio[]> => (await todos()).filter(esDeQuienEsta);
  // Lo que dejó otra persona sin mandar: queda guardado y no sale con esta sesión.
  const apartados = async (): Promise<Cambio[]> => (await todos()).filter((c) => !esDeQuienEsta(c));

  // El orden es creciente aunque dos cambios entren en el mismo milisegundo.
  let ultimoOrden = 0;
  const siguienteOrden = () => (ultimoOrden = Math.max(Date.now() * 1000, ultimoOrden + 1));

  async function encolar(cambio: CambioNuevo): Promise<number> {
    const db = await opciones.abrirBase();
    const tx = db.transaction(opciones.almacen, "readwrite");
    const almacen = tx.objectStore(opciones.almacen);
    const orden = siguienteOrden();
    let cuerpo = cambio.cuerpo;
    if (opciones.seFunde?.(cambio)) {
      const existentes = await new Promise<Cambio[]>((r, j) => { const q = almacen.getAll(); q.onsuccess = () => r(q.result as Cambio[]); q.onerror = () => j(q.error); });
      for (const viejo of existentes.filter((c) => c.tipo === cambio.tipo && c.ruta === cambio.ruta && esDeQuienEsta(c)).sort((a, b) => a.orden - b.orden)) {
        cuerpo = { ...(viejo.cuerpo as object), ...(cuerpo as object) };
        almacen.delete(viejo.orden);
      }
    }
    const autor = opciones.autor?.() ?? undefined;
    almacen.put({ ...cambio, cuerpo, orden, creado_en: new Date().toISOString(), ...(autor ? { autor } : {}) });
    await terminada(tx);
    avisar();
    return orden;
  }

  // Cambios que el servidor rechazó (4xx) mientras se drenaba la cola, para que quien los pidió vea el error.
  const rechazados = new Map<number, Error>();
  let drenaje: Promise<number> | null = null;

  // Reenvía en orden, un solo drenaje a la vez, hasta vaciar la cola. Se detiene en el primer
  // error de red; un 4xx (salvo 401 y 429) es un cambio inválido que reintentar no arregla: se
  // descarta y se registra.
  function enviarPendientes(): Promise<number> {
    if (drenaje) return drenaje;
    drenaje = (async () => {
      try {
        const db = await opciones.abrirBase();
        let cortado = false;
        while (!cortado) {
          const lista = await pendientes();
          if (lista.length === 0) break;
          for (const cambio of lista) {
            try {
              await opciones.enviar(cambio);
            } catch (e) {
              const estado = opciones.estadoDe(e);
              if (estado && estado >= 400 && estado < 500 && estado !== 401 && estado !== 429) {
                console.error("cambio pendiente rechazado por el servidor; se descarta", cambio, e);
                rechazados.set(cambio.orden, e as Error);
              } else {
                cortado = true;
                break;
              }
            }
            const tx = db.transaction(opciones.almacen, "readwrite");
            tx.objectStore(opciones.almacen).delete(cambio.orden);
            await terminada(tx);
            await opciones.alEnviar?.();
            avisar();
          }
        }
        const quedan = (await pendientes()).length;
        avisar();
        return quedan;
      } finally {
        drenaje = null;
      }
    })();
    return drenaje;
  }

  // Primero se guarda en la cola y recién después se manda, en orden con lo que ya estaba: si
  // la persona recarga la pantalla o cierra la pestaña con el pedido en vuelo, el cambio no se
  // pierde, y dos cambios seguidos nunca llegan al revés. Con red, sale al instante y se saca
  // de la cola. Devuelve si quedó encolado (sin red).
  async function enviarOEncolar(tipo: string, metodo: Cambio["metodo"], ruta: string, cuerpo: unknown): Promise<{ encolado: boolean }> {
    const orden = await encolar({ tipo, metodo, ruta, cuerpo }).catch(() => null);
    if (orden === null) {
      try { await opciones.enviar({ tipo, metodo, ruta, cuerpo }); }
      catch (e) { throw opciones.errorSinBase ? opciones.errorSinBase(e) : e; }
      return { encolado: false };
    }
    await enviarPendientes();
    const rechazo = rechazados.get(orden);
    if (rechazo) { rechazados.delete(orden); throw rechazo; }
    return { encolado: (await pendientes()).some((c) => c.orden === orden) };
  }

  return { alCambiar, pendientes, apartados, enviarPendientes, enviarOEncolar };
}
