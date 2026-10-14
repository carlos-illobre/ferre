import { base } from "../base.js";
import { anotarEvento } from "../eventos.js";
import * as datos from "./datos.js";
import type { z } from "zod";
import type { Cliente } from "../contratos/clientes.js";
import type { clienteNuevo } from "./esquemas.js";

// Solo los clientes importantes, los que compran a cuenta corriente. El de barrio no se carga.
export const conDeuda = (): Promise<Cliente[]> => datos.activosConDeuda(base);

// Da de alta un cliente. El nombre ya llega validado (sin nombre no se puede: `esquemas.ts`).
export async function alta(c: z.output<typeof clienteNuevo>, usuarioId: string): Promise<Cliente> {
  const nuevo = { nombre: c.nombre, telefono: c.telefono || null, cuenta_corriente: c.cuenta_corriente ?? true };
  const id = await datos.insertar(base, nuevo);
  await anotarEvento(base, { tipo: "cliente.creado", usuarioId, contenido: { id, nombre: c.nombre } });
  return { id, ...nuevo, deuda: "0" };
}
