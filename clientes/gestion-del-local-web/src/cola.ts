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

async function encolar(cambio: Omit<Cambio, "orden" | "creado_en">): Promise<void> {
  const db = await abrirBase();
  const tx = db.transaction("cola", "readwrite");
  tx.objectStore("cola").put({ ...cambio, orden: Date.now() * 1000 + Math.floor(Math.random() * 1000), creado_en: new Date().toISOString() });
  await new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
  avisar();
}

function esErrorDeRed(e: unknown): boolean {
  return !(e instanceof ErrorApi);
}

// Intenta ahora; si no hay red, encola y avisa. Devuelve si quedó encolado.
export async function enviarOEncolar(tipo: string, metodo: Cambio["metodo"], ruta: string, cuerpo: unknown): Promise<{ encolado: boolean }> {
  try {
    await api(ruta, { method: metodo, body: JSON.stringify(cuerpo) });
    await guardarMeta("ultimo_envio", new Date().toISOString());
    return { encolado: false };
  } catch (e) {
    if (!esErrorDeRed(e)) throw e;
    await encolar({ tipo, metodo, ruta, cuerpo });
    return { encolado: true };
  }
}

let enviando = false;
// Reenvía en orden. Se detiene en el primer error de red; un 4xx (salvo 401/429) es un
// cambio inválido que reintentar no arregla: se descarta y se registra.
export async function enviarPendientes(): Promise<number> {
  if (enviando) return (await pendientes()).length;
  enviando = true;
  try {
    const lista = await pendientes();
    const db = await abrirBase();
    for (const cambio of lista) {
      try {
        await api(cambio.ruta, { method: cambio.metodo, body: JSON.stringify(cambio.cuerpo) });
      } catch (e) {
        const estado = (e as { estado?: number }).estado;
        if (estado && estado >= 400 && estado < 500 && estado !== 401 && estado !== 429) {
          console.error("cambio pendiente rechazado por el servidor; se descarta", cambio, e);
        } else {
          break;
        }
      }
      const tx = db.transaction("cola", "readwrite");
      tx.objectStore("cola").delete(cambio.orden);
      await new Promise<void>((r, j) => { tx.oncomplete = () => r(); tx.onerror = () => j(tx.error); });
      await guardarMeta("ultimo_envio", new Date().toISOString());
    }
    const quedan = (await pendientes()).length;
    avisar();
    return quedan;
  } finally {
    enviando = false;
  }
}
