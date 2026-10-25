import { readFileSync } from "node:fs";
import path from "node:path";
import { crearApp } from "../../../servidor/src/rutas";
import { crearReglas } from "../../../servidor/src/reglas";
import { almacenEnMemoria } from "../../../servidor/src/memoria";
import type { Pedir, Puede } from "../tipos";

// El servicio de verdad, con los datos en memoria, para probar las pantallas contra la misma
// regla que corre en el servidor. `pedir` hace lo que hace la aplicación: reenvía con el token
// y quién llama, y convierte los errores como dice el README.

export const VENTA = readFileSync(path.resolve(__dirname, "../modelo/ejemplos/venta.bpmn"), "utf8");
const TOKEN = "token-de-prueba";

export function servicio() {
  const app = crearApp({ reglas: crearReglas(almacenEnMemoria()), token: TOKEN, permisos: { ver: "procesos.ver", dibujar: "procesos.dibujar" } });
  let sinConexion = false;
  const pedidos: string[] = [];
  const como = (puede: Puede): Pedir => async (ruta, init = {}) => {
    pedidos.push(`${init.method ?? "GET"} ${ruta}`);
    if (sinConexion) throw Object.assign(new Error("Sin conexión"), { estado: 0 });
    const r = await app.request(ruta, {
      ...init,
      headers: { "Content-Type": "application/json", "X-Token-Servicio": TOKEN, "X-Usuario-Id": "u1", "X-Usuario-Nombre": "Carlos", "X-Permisos": [puede.ver && "procesos.ver", puede.dibujar && "procesos.dibujar"].filter(Boolean).join(",") },
    });
    const datos = r.status === 204 ? undefined : await r.json();
    if (!r.ok) throw Object.assign(new Error((datos as { error: string }).error), { estado: r.status, datos });
    return datos;
  };
  const dibuja = como({ ver: true, dibujar: true });
  return {
    pedidos,
    como,
    dibuja,
    sinConexion: (si: boolean) => { sinConexion = si; },
    /** Crea un proceso y, si se pide, lo deja vigente. */
    async cargar(nombre: string, bpmn = VENTA, vigente = true) {
      const p = (await dibuja("/procesos", { method: "POST", body: JSON.stringify({ nombre, bpmn }) })) as { id: string; revision: number };
      if (vigente) await dibuja(`/procesos/${p.id}/vigente`, { method: "POST", body: JSON.stringify({ revision: p.revision }) });
      return p.id;
    },
  };
}

/** Un guardado de navegador en memoria, para lo que el módulo recuerda en el dispositivo. */
export function guardadoEnMemoria() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}
