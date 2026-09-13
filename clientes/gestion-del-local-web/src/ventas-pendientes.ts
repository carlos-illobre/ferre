import { api } from "./api";

// Cola de ventas hechas sin conexión (issue #18, primera mitad): la venta se guarda acá
// antes de enviarse, y se reenvía al reconectar. El id lo pone el cliente, así el
// servidor no la duplica si llega dos veces.
const CLAVE = "ferre.ventas-pendientes";
export type VentaPendiente = { id: string; fecha: string; cuerpo: unknown; total: number };

export function leerPendientes(): VentaPendiente[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? "[]") as VentaPendiente[]; } catch { return []; }
}
function guardar(lista: VentaPendiente[]) {
  localStorage.setItem(CLAVE, JSON.stringify(lista));
}
export function encolar(v: VentaPendiente) {
  guardar([...leerPendientes(), v]);
}

// Envía las pendientes en orden. Devuelve cuántas quedaron.
export async function enviarPendientes(): Promise<number> {
  const lista = leerPendientes();
  const quedan: VentaPendiente[] = [];
  for (const v of lista) {
    try {
      await api("/ventas", { method: "POST", body: JSON.stringify(v.cuerpo) });
    } catch (e) {
      const estado = (e as { estado?: number }).estado;
      // 4xx: la venta es inválida y reintentar no ayuda; se saca de la cola y se avisa.
      if (estado && estado >= 400 && estado < 500 && estado !== 401 && estado !== 429) {
        console.error("venta pendiente rechazada", v.id, e);
        continue;
      }
      quedan.push(v, ...lista.slice(lista.indexOf(v) + 1));
      break;
    }
  }
  guardar(quedan);
  return quedan.length;
}
