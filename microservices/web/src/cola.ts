import { api, ErrorApi } from "./api";
import { abrirBase, guardarMeta } from "./almacen";
import { guardaEnElDispositivo, SIN_CONEXION_Y_SIN_GUARDADO } from "./guardado";
import { crearCola, type Cambio } from "./plataforma/sin-conexion/cola";

// La cola de cambios de Ferrebress hechos sin conexión (issue #18): ventas, «no llevó»,
// márgenes y precios, ajustes de stock, renglones de conteo. La cola en sí es tecnología de la
// plataforma; acá se dice cómo se mandan los cambios de esta aplicación y sus reglas:
// - un cambio de producto reemplaza al anterior del mismo producto que siga en la cola;
// - cada envío anota cuándo fue el último, para mostrar «Sincronizado hace…»;
// - un celular con el guardado deshabilitado (RF-84) manda directo, y si no hay conexión no
//   registra ni guarda nada y dice cómo habilitar el trabajo sin conexión.
export type { Cambio };

const cola = crearCola({
  abrirBase,
  almacen: "cola",
  enviar: async (c) => { await api(c.ruta, { method: c.metodo, body: JSON.stringify(c.cuerpo), keepalive: true }); },
  estadoDe: (e) => (e as { estado?: number }).estado,
  seFunde: (c) => c.tipo === "producto.cambio",
  alEnviar: () => guardarMeta("ultimo_envio", new Date().toISOString()),
  errorSinBase: (e) => (!(e instanceof ErrorApi) && !guardaEnElDispositivo() ? new ErrorApi(503, SIN_CONEXION_Y_SIN_GUARDADO) : e),
});

export const alCambiarLaCola = cola.alCambiar;
export const pendientes = cola.pendientes;
export const enviarPendientes = cola.enviarPendientes;
export const enviarOEncolar = cola.enviarOEncolar;

// Los cambios de productos que todavía no llegaron al servidor, para aplicarlos sobre un
// catálogo recién bajado (que no los tiene). Se aplican en orden: el último gana.
export async function cambiosDeProductosPendientes(): Promise<Map<string, Record<string, unknown>>> {
  const resultado = new Map<string, Record<string, unknown>>();
  for (const c of await pendientes()) {
    const id = c.tipo === "producto.cambio" ? c.ruta.split("/").pop() : undefined;
    if (id) resultado.set(id, { ...resultado.get(id), ...(c.cuerpo as Record<string, unknown>) });
  }
  return resultado;
}
