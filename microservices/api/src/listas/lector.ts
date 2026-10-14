import { config } from "../config.js";
import type { FilaDeLista, Salteada } from "../contratos/listas.js";

// Cliente del servicio listas-de-proveedores (ADR-003): recibe la planilla y devuelve
// filas normalizadas con el costo neto ya calculado y explicado.
export type FilaLeida = FilaDeLista;
export type Lectura = {
  proveedor: string;
  fecha_lista: string | null;
  filas: FilaLeida[];
  salteadas: Salteada[];
  ofertas: unknown[];
  avisos: string[];
  resumen: { leidas: number; salteadas: number; ofertas: number };
};
export type ConfiguracionLectura = {
  lector: string | null;
  precios_incluyen_iva: boolean;
  descuento_general: string;
  descuento_contado: string;
};

export async function leerPlanilla(archivo: File, configuracion: ConfiguracionLectura): Promise<Lectura> {
  const cuerpo = new FormData();
  cuerpo.set("archivo", archivo, archivo.name);
  if (configuracion.lector) cuerpo.set("proveedor", configuracion.lector);
  cuerpo.set("precios_incluyen_iva", String(configuracion.precios_incluyen_iva));
  cuerpo.set("descuento_general", configuracion.descuento_general);
  cuerpo.set("descuento_contado", configuracion.descuento_contado);
  const respuesta = await fetch(`${config.listasDeProveedoresUrl}/lecturas`, {
    method: "POST",
    headers: { "X-Token-Servicio": config.tokenServicio },
    body: cuerpo,
  });
  if (!respuesta.ok) {
    const detalle = (await respuesta.json().catch(() => ({}))) as { detail?: string };
    throw new ErrorDeLectura(respuesta.status, detalle.detail ?? `El servicio de listas respondió ${respuesta.status}`);
  }
  return (await respuesta.json()) as Lectura;
}

export async function detectarProveedor(archivo: File): Promise<string | null> {
  const cuerpo = new FormData();
  cuerpo.set("archivo", archivo, archivo.name);
  const respuesta = await fetch(`${config.listasDeProveedoresUrl}/detecciones`, {
    method: "POST",
    headers: { "X-Token-Servicio": config.tokenServicio },
    body: cuerpo,
  });
  if (!respuesta.ok) return null;
  return ((await respuesta.json()) as { proveedor: string | null }).proveedor;
}

export class ErrorDeLectura extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}
