import { base, Deshacer, enTransaccion } from "../base.js";
import { anotarEvento } from "../eventos.js";
import * as datos from "./datos.js";
import type { z } from "zod";
import type { borradorDePedido } from "./esquemas.js";

// Pedidos a proveedores (RF-55, decisión 52). Un pedido nace como borrador, se manda como
// texto (el servidor no manda nada: anota que se mandó) y el ingreso de mercadería lo va
// recibiendo (ver `compras/`). Quien solo registra ingresos ve los que esperan mercadería.
export type Resultado = { ok: true } | { ok: false; estado: 400 | 404 | 409; error: string };
const mal = (estado: 400 | 404 | 409, error: string): Resultado => ({ ok: false, estado, error });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ESPERAN = ["enviado", "recibido_parcial"];
// Lo que llega ya viene validado con su esquema (`esquemas.ts`).
export type Entrada = z.output<typeof borradorDePedido>;

export const lista = (todos: boolean) => datos.lista(base, todos ? null : ESPERAN);

export async function uno(id: string, todos: boolean) {
  if (!UUID.test(id)) return null;
  const p = await datos.uno(base, id);
  return p && (todos || ESPERAN.includes(String(p.estado))) ? p : null;
}

// Guardar el borrador: lo crea o lo reemplaza entero. Se llama cada vez que cambia.
export function guardarBorrador(v: Entrada, usuarioId: string): Promise<Resultado> {
  return enTransaccion(async (trx) => {
    if (!(await datos.proveedorActivo(trx, v.proveedor_id))) throw new Deshacer(mal(404, "No existe ese proveedor"));
    const estado = await datos.estadoTrabado(trx, v.id);
    if (estado && estado !== "borrador") throw new Deshacer(mal(409, "Ese pedido ya se mandó: no se puede cambiar"));
    if (estado) await datos.cambiarProveedor(trx, v.id, v.proveedor_id);
    else await datos.crear(trx, v.id, v.proveedor_id, usuarioId);
    await datos.reemplazarRenglones(trx, v.id, v.proveedor_id, v.items ?? []);
    return { ok: true } as Resultado;
  });
}

export async function borrar(id: string): Promise<Resultado> {
  return (await datos.borrarBorrador(base, id)) ? { ok: true } : mal(409, "Solo se borra un pedido que todavía no se mandó");
}

// Mandar: el texto sale del celular o de la computadora; acá queda anotado que se mandó, quién
// y cuándo. Si viene el WhatsApp del proveedor, se le guarda.
export async function mandar(id: string, whatsapp: string | undefined, usuarioId: string): Promise<Resultado> {
  const numero = whatsapp === undefined ? null : String(whatsapp).replace(/\D/g, "");
  if (numero !== null && (numero.length < 8 || numero.length > 15)) return mal(400, "El número de WhatsApp va con código de país y de área, solo números: 5491155550101");
  return enTransaccion(async (trx) => {
    const p = await datos.paraMandar(trx, id);
    if (!p) throw new Deshacer(mal(404, "No existe ese pedido"));
    if (p.estado !== "borrador") throw new Deshacer(mal(409, "Ese pedido ya se mandó"));
    if (Number(p.renglones) === 0) throw new Deshacer(mal(400, "El pedido no tiene productos"));
    await datos.marcarEnviado(trx, id, usuarioId);
    if (numero) await datos.guardarWhatsapp(trx, p.proveedor_id, numero);
    await anotarEvento(trx, { tipo: "pedido.enviado", usuarioId, contenido: { id, proveedor: p.proveedor, renglones: Number(p.renglones) } });
    return { ok: true } as Resultado;
  });
}

// Cancelar el que se mandó y no va a llegar; cerrar el que llegó incompleto y cuyo resto no va a llegar.
export function terminar(id: string, desde: string, hasta: string, evento: string, rechazo: string, usuarioId: string): Promise<Resultado> {
  return enTransaccion(async (trx) => {
    if (!(await datos.pasarDeEstado(trx, id, desde, hasta, usuarioId))) throw new Deshacer(mal(409, rechazo));
    await anotarEvento(trx, { tipo: evento, usuarioId, contenido: { id } });
    return { ok: true } as Resultado;
  });
}
