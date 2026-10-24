import { base } from "../persistencia/conexion.js";
import { anotarEvento } from "../persistencia/eventos.js";
import * as datos from "../persistencia/deposito.js";
import type { FilaDeStock } from "../persistencia/deposito.js";
import * as copia from "../productos/copia.js";
import { marcaParaDispositivo, marcaValida } from "../productos/reglas.js";
import type { Movimiento, Stock, StockAjustado, StockQueCambio } from "../contratos/stock.js";
import type { Enviable } from "../enviable.js";

// Stock actual y valorización (issue #33). El valor es stock × costo vigente.
// El dinero invertido es de quien tiene «Ver el dinero invertido» (RF-53, RF-99): a los demás
// les llegan las cantidades, sin costos ni valores.
export async function stockConValor(veElDineroInvertido: boolean): Promise<Enviable<Stock>> {
  // El stock, de la base; el costo vigente y el proveedor, de la copia del catálogo (specs/018).
  // Los productos que ya no están a la venta (dados de baja o unidos a otro) no van.
  const filas: FilaDeStock[] = [];
  for (const m of await datos.movimientosPorProducto(base)) {
    const p = copia.fila(m.id);
    if (!p?.vigente) continue;
    const costo = p.costo_neto === null ? null : Number(p.costo_neto);
    filas.push({ id: m.id, stock: m.stock, costo_neto: p.costo_neto, proveedor: p.proveedor, valor: (Math.round(Number(m.stock) * (costo ?? 0) * 100) / 100).toFixed(2), ultimo_movimiento: m.ultimo_movimiento });
  }
  if (!veElDineroInvertido) return { productos: filas.map((r) => ({ id: r.id, stock: r.stock, proveedor: r.proveedor, ultimo_movimiento: r.ultimo_movimiento, costo_neto: null, valor: "0" })), valor_total: 0, por_proveedor: {} };
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

// GET /stock/cambios?marca= (specs/018, historia 5): el stock que cambió desde la descarga anterior.
export async function stockQueCambio(marca: string | undefined): Promise<StockQueCambio> {
  const cambio = await datos.stockQueCambio(marcaValida(marca));
  return { ...cambio, marca: marcaParaDispositivo(cambio.marca) };
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
