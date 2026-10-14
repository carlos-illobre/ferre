import { base } from "../base.js";
import { anotarEvento } from "../eventos.js";
import * as datos from "./datos.js";
import type { Movimiento, Stock, StockAjustado } from "../contratos/stock.js";
import type { Enviable } from "../enviable.js";

// Stock actual y valorización (issue #33). El valor es stock × costo vigente.
// El dinero invertido es de quien ve los números del negocio (RF-53, RF-72): a los demás les
// llegan las cantidades, sin costos ni valores.
export async function stockConValor(veLosNumeros: boolean): Promise<Enviable<Stock>> {
  const filas = await datos.stockDeTodos(base);
  if (!veLosNumeros) return { productos: filas.map((r) => ({ id: r.id, stock: r.stock, proveedor: r.proveedor, ultimo_movimiento: r.ultimo_movimiento, costo_neto: null, valor: "0" })), valor_total: 0, por_proveedor: {} };
  const porProveedor: Record<string, { unidades: number; valor: number; productos: number }> = {};
  let total = 0;
  for (const r of filas) {
    const entrada = (porProveedor[r.proveedor ?? "sin proveedor"] ??= { unidades: 0, valor: 0, productos: 0 });
    entrada.unidades += Number(r.stock);
    entrada.valor += Number(r.valor);
    entrada.productos += 1;
    total += Number(r.valor);
  }
  return { productos: filas, valor_total: Math.round(total * 100) / 100, por_proveedor: porProveedor };
}

export const movimientos = (productoId: string): Promise<Enviable<Movimiento>[]> => datos.movimientosDe(base, productoId);

// Ajuste rápido: «hay tantas». Se registra la diferencia contra el stock actual, con motivo,
// que es obligatorio (RF-53) venga de la interfaz que venga: lo exige el esquema del pedido.
export async function ajustar(productoId: string, cantidadReal: number, motivo: string, usuarioId: string): Promise<StockAjustado> {
  const actual = await datos.stockDe(base, productoId);
  const diferencia = cantidadReal - actual;
  if (Math.abs(diferencia) < 0.0005) return { stock: actual, diferencia: 0 };
  await datos.anotarAjuste(base, { producto_id: productoId, cantidad: diferencia, nota: `había ${actual}, hay ${cantidadReal}: ${motivo}` });
  await anotarEvento(base, { tipo: "stock.ajustado", usuarioId, contenido: { productoId, antes: actual, despues: cantidadReal, motivo: motivo } });
  return { stock: cantidadReal, diferencia };
}
