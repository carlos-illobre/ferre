import { base } from "../base.js";
import { anotarEvento } from "../eventos.js";
import * as datos from "./datos.js";
import type { Cliente, ClienteEntrada } from "../contratos/clientes.js";

// Solo los clientes importantes, los que compran a cuenta corriente. El de barrio no se carga.
export const conDeuda = (): Promise<Cliente[]> => datos.activosConDeuda(base);

export type { ClienteEntrada };
// Da de alta un cliente; sin nombre no se puede.
export async function alta(c: ClienteEntrada, usuarioId: string): Promise<Cliente | null> {
  const nombre = c.nombre?.trim();
  if (!nombre) return null;
  const nuevo = { nombre, telefono: c.telefono?.trim() || null, cuenta_corriente: c.cuenta_corriente ?? true };
  const id = await datos.insertar(base, nuevo);
  await anotarEvento(base, { tipo: "cliente.creado", usuarioId, contenido: { id, nombre } });
  return { id, ...nuevo, deuda: "0" };
}
