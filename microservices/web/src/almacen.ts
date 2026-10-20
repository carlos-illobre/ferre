import { guardaEnElDispositivo } from "./guardado";
import { crearBaseLocal } from "./plataforma/almacenamiento/base-local";

// Lo que el mostrador necesita sin conexión (ADR-005): catálogo, stock, clientes, ventas de los
// últimos 7 días y la cola de cambios pendientes. La base local en sí es tecnología de la
// plataforma; acá se dice qué guarda Ferrebress y cuándo: un celular con el guardado
// deshabilitado (RF-84) no la abre, y cada parte de la aplicación ya sabe seguir sin ella.
export type Almacen = "catalogo" | "stock" | "clientes" | "ventas" | "cola" | "meta";

const base = crearBaseLocal<Almacen>({
  nombre: "ferre",
  version: 1,
  almacenes: [
    { nombre: "catalogo", clave: "id" },
    { nombre: "stock", clave: "id" },
    { nombre: "clientes", clave: "id" },
    { nombre: "ventas", clave: "id", indices: ["fecha"] },
    { nombre: "cola", clave: "orden" },
    { nombre: "meta", clave: "clave" },
  ],
  habilitada: guardaEnElDispositivo,
});

export const abrirBase = base.abrir;
export const leer = base.leer;
export const leerTodo = base.leerTodo;
export const guardar = base.guardar;
export const reemplazarTodo = base.reemplazarTodo;
export const borrar = base.borrar;
export const contar = base.contar;
export const borrarAnterioresA = (almacen: "ventas", indice: "fecha", limite: string): Promise<number> => base.borrarAnterioresA(almacen, indice, limite);

// Borra del dispositivo todos los datos del negocio (al deshabilitar el guardado, RF-84).
export const borrarLoGuardado = base.borrarTodo;

// Al abrir la aplicación: un celular con el guardado deshabilitado no conserva datos del
// negocio, tampoco los que hubiera guardado una versión anterior (RF-84).
// El catálogo, el stock y los clientes ya no se guardan en ningún dispositivo (specs/018, E24): lo
// que dejó una versión anterior se borra.
export async function respetarElGuardado(): Promise<void> {
  if (!guardaEnElDispositivo()) { await borrarLoGuardado(); return; }
  await Promise.all([reemplazarTodo("catalogo", []), reemplazarTodo("stock", []), reemplazarTodo("clientes", []), borrar("meta", "catalogo_primeros"), borrar("meta", "catalogo_bajado")]).catch(() => undefined);
}

export async function leerMeta<T>(clave: string): Promise<T | undefined> {
  const fila = await leer<{ clave: string; valor: T }>("meta", clave);
  return fila?.valor;
}

export function guardarMeta<T>(clave: string, valor: T): Promise<void> {
  return guardar("meta", { clave, valor });
}
