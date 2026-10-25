import { anotarEvento } from "../eventos/anotar.js";
import { Deshacer, enTransaccion } from "../persistencia/transaccion.js";
import { base } from "../persistencia/conexion.js";
import * as datos from "../persistencia/duplicados.js";
import type { Sugerencia, Union } from "../contratos/equivalencias.js";
import type { Enviable } from "../enviable.js";

// Duplicados entre proveedores (issue #29), en sus reglas (ADR-018): quien tiene el permiso ve
// las sugerencias y las une o las rechaza; también une dos productos a mano y separa lo unido,
// a partir del registro de lo que se movió. La capa de datos tiene el SQL.
export async function sugerencias(): Promise<Enviable<Sugerencia>[]> {
  const salida: Enviable<Sugerencia>[] = [];
  for (const r of await datos.pendientes()) {
    const [a, b] = await Promise.all([datos.resumenDe(r.producto_a), datos.resumenDe(r.producto_b)]);
    salida.push({ id: r.id, motivo: r.motivo, creado_en: r.creado_en, a, b } as Enviable<Sugerencia>);
  }
  return salida;
}

// Volver a buscar duplicados en todo el catálogo (las listas ya lo hacen al aplicarse).
export const buscar = (): Promise<number> => datos.sugerirEquivalencias(base, null);

export type Resultado = { ok: true } | { ok: false; estado: 400 | 404 | 409; error: string };
const mal = (estado: 400 | 404 | 409, error: string): Resultado => ({ ok: false, estado, error });

// «Es el mismo» (conservando el lado elegido) o «son distintos».
export function resolver(id: string, accion: "unir" | "rechazar", lado: "a" | "b" | undefined, usuarioId: string): Promise<Resultado> {
  return enTransaccion(async (trx) => {
    const sugerencia = await datos.sugerenciaPendiente(trx, id);
    if (!sugerencia) throw new Deshacer(mal(409, "La sugerencia no existe o ya se resolvió"));
    if (accion === "unir") {
      const conservar = lado === "b" ? sugerencia.producto_b : sugerencia.producto_a;
      const absorber = conservar === sugerencia.producto_a ? sugerencia.producto_b : sugerencia.producto_a;
      await datos.unirProductos(trx, conservar, absorber);
      await datos.resolverSugerencia(trx, id, "unida", usuarioId);
      await anotarEvento(trx, { tipo: "producto.unido", usuarioId, contenido: { conservar, absorber, sugerencia: id } });
    } else {
      await datos.resolverSugerencia(trx, id, "rechazada", usuarioId);
      await anotarEvento(trx, { tipo: "equivalencia.rechazada", usuarioId, contenido: { sugerencia: id } });
    }
    return { ok: true } as Resultado;
  });
}

// Unión manual de dos productos cualesquiera.
// Los dos productos ya llegan distintos: lo exige el esquema del pedido.
export function unirAMano(conservar: string, absorber: string, usuarioId: string): Promise<Resultado> {
  return enTransaccion(async (trx) => {
    if ((await datos.activos(trx, conservar, absorber)) !== 2) throw new Deshacer(mal(404, "Alguno de los productos no existe o ya fue unido"));
    await datos.unirProductos(trx, conservar, absorber);
    await anotarEvento(trx, { tipo: "producto.unido", usuarioId, contenido: { conservar, absorber, manual: true } });
    return { ok: true } as Resultado;
  });
}

// Las uniones hechas, mientras el absorbido siga dentro del conservado: se pueden separar.
export const unidos = (): Promise<Enviable<Union>[]> => datos.unidos();

// Deshacer una unión a partir del registro de lo que se movió (su tabla, union_de_productos).
export function separar(absorbido: string, usuarioId: string): Promise<Resultado> {
  return enTransaccion(async (trx) => {
    const conservar = await datos.reemplazoDe(trx, absorbido);
    if (!conservar) throw new Deshacer(mal(409, "Ese producto no está unido a otro"));
    const registro = await datos.ultimaUnion(trx, absorbido);
    if (!registro || registro.conservar !== conservar) throw new Deshacer(mal(409, "No hay registro de esa unión: no se puede separar sola"));
    await datos.separarProductos(trx, conservar, absorbido, registro);
    await anotarEvento(trx, { tipo: "producto.separado", usuarioId, contenido: { conservar, absorbido } });
    return { ok: true } as Resultado;
  });
}
