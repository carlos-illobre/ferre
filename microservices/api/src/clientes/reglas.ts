import { base } from "../base.js";
import { anotarEvento } from "../eventos.js";
import * as datos from "./datos.js";

// Solo los clientes importantes, los que compran a cuenta corriente. El de barrio no se carga.
export const conDeuda = () => datos.activosConDeuda(base);

export type ClienteEntrada = { nombre?: string; telefono?: string; cuenta_corriente?: boolean };
// Da de alta un cliente; sin nombre no se puede.
export async function alta(c: ClienteEntrada, usuarioId: string) {
  const nombre = c.nombre?.trim();
  if (!nombre) return null;
  const nuevo = { nombre, telefono: c.telefono?.trim() || null, cuenta_corriente: c.cuenta_corriente ?? true };
  const id = await datos.insertar(base, nuevo);
  await anotarEvento(base, { tipo: "cliente.creado", usuarioId, contenido: { id, nombre } });
  return { id, ...nuevo, deuda: "0" };
}
