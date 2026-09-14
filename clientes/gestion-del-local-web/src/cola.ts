import { api, ErrorApi } from "./api";
import { abrirBase, guardarMeta, leerTodo } from "./almacen";

// Cola única de cambios hechos sin conexión (issue #18): ventas, "no llevó", márgenes y
// precios, ajustes de stock, renglones de conteo. Cada cambio es un pedido HTTP
// completo que se guarda primero en el dispositivo y se reenvía en orden al reconectar.
// Los ids los pone el cliente, así reenviar no duplica.
export type Cambio = { orden: number; creado_en: string; tipo: string; metodo: "POST" | "PUT" | "PATCH" | "DELETE"; ruta: string; cuerpo: unknown };

const oyentes = new Set<() => void>();
export function alCambiarLaCola(oyente: () => void): () => void {
  oyentes.add(oyente);
  return () => oyentes.delete(oyente);
}
const avisar = () => oyentes.forEach((o) => o());

export async function pendientes(): Promise<Cambio[]> {
  const lista = await leerTodo<Cambio>("cola");
  return lista.sort((a, b) => a.orden - b.orden);
}

// El orden es creciente aunque dos cambios entren en el mismo milisegundo (una prueba
// unitaria encontró que un azar los podía invertir).
let ultimoOrden = 0;
const siguienteOrden = () => (ultimoOrden = Math.max(Date.now() * 1000, ultimoOrden + 1));

// Un cambio de producto reemplaza al anterior del mismo producto que siga en la cola
// (se funden los cuerpos): así nunca se reenvía un margen viejo después de uno nuevo.
async function encolar(cambio: Omit<Cambio, "orden" | "creado_en">): Promise<number> {
  const db = await abrirBase();
  const tx = db.transaction("cola", "readwrite");
  const almacen = tx.objectStore("cola");
  const orden = siguienteOrden();
  let cuerpo = cambio.cuerpo;
  if (cambio.tipo === "producto.cambio") {
    const todos = await new Promise<Cambio[]>((r, j) => { const q = almacen.getAll(); q.onsuccess = () => r(q.result as Cambio[]); q.onerror = () => j(q.error); });
    for (const viejo of todos.filter((c) => c.tipo === cambio.tipo && c.ruta === cambio.ruta).sort((a, b) => a.orden - b.orden)) {
      cuerpo = { ...(viejo.cuerpo as object), ...(cuerpo as object) };
      almacen.delete(viejo.orden);
    }
  }
  almacen.put({ ...cambio, cuerpo, orden, creado_en: new Date().toISOString() });
  await new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
  avisar();
  return orden;
}

async function desencolar(orden: number): Promise<void> {
  const db = await abrirBase();
  const tx = db.transaction("cola", "readwrite");
  tx.objectStore("cola").delete(orden);
  await new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
  avisar();
}

function esErrorDeRed(e: unknown): boolean {
  return !(e instanceof ErrorApi);
}

// Primero se guarda en la cola y recién después se manda, en orden con lo que ya estaba:
// si el empleado recarga la pantalla o cierra la pestaña con el pedido en vuelo, el cambio
// no se pierde (se reenvía al arrancar; los ids los pone el cliente y un margen repetido
// no hace daño), y dos cambios seguidos nunca llegan al revés. Con red, sale al instante
// y se saca de la cola. Devuelve si quedó encolado (sin red).
export async function enviarOEncolar(tipo: string, metodo: Cambio["metodo"], ruta: string, cuerpo: unknown): Promise<{ encolado: boolean }> {
  const orden = await encolar({ tipo, metodo, ruta, cuerpo }).catch(() => null);
  if (orden === null) {
    // Sin IndexedDB (navegador raro): se manda directo, como antes.
    await api(ruta, { method: metodo, body: JSON.stringify(cuerpo), keepalive: true });
    return { encolado: false };
  }
  await enviarPendientes();
  const rechazo = rechazados.get(orden);
  if (rechazo) { rechazados.delete(orden); throw rechazo; }
  return { encolado: (await pendientes()).some((c) => c.orden === orden) };
}

// Los cambios de productos que todavía no llegaron al servidor, para aplicarlos sobre un
// catálogo recién bajado (que no los tiene). Se aplican en orden: el último gana.
export async function cambiosDeProductosPendientes(): Promise<Map<string, Record<string, unknown>>> {
  const resultado = new Map<string, Record<string, unknown>>();
  for (const c of await pendientes().catch(() => [] as Cambio[])) {
    const id = c.tipo === "producto.cambio" ? c.ruta.split("/").pop() : undefined;
    if (id) resultado.set(id, { ...resultado.get(id), ...(c.cuerpo as Record<string, unknown>) });
  }
  return resultado;
}

// Cambios que el servidor rechazó (4xx) mientras se drenaba la cola, para que quien los
// pidió vea el error.
const rechazados = new Map<number, Error>();
let drenaje: Promise<number> | null = null;

// Reenvía en orden, un solo drenaje a la vez, hasta vaciar la cola. Se detiene en el
// primer error de red; un 4xx (salvo 401/429) es un cambio inválido que reintentar no
// arregla: se descarta y se registra.
export function enviarPendientes(): Promise<number> {
  if (drenaje) return drenaje;
  drenaje = (async () => {
    try {
      const db = await abrirBase();
      let cortado = false;
      while (!cortado) {
        const lista = await pendientes();
        if (lista.length === 0) break;
        for (const cambio of lista) {
          try {
            await api(cambio.ruta, { method: cambio.metodo, body: JSON.stringify(cambio.cuerpo), keepalive: true });
          } catch (e) {
            const estado = (e as { estado?: number }).estado;
            if (estado && estado >= 400 && estado < 500 && estado !== 401 && estado !== 429) {
              console.error("cambio pendiente rechazado por el servidor; se descarta", cambio, e);
              rechazados.set(cambio.orden, e as Error);
            } else {
              cortado = true;
              break;
            }
          }
          const tx = db.transaction("cola", "readwrite");
          tx.objectStore("cola").delete(cambio.orden);
          await new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
          await guardarMeta("ultimo_envio", new Date().toISOString());
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
