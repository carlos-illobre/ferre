// Lo que el servidor responde sobre el stock. Solo tipos: el cliente web los toma al compilar
// (ADR-018), así que acá no va código ni nombres de tablas.
import type { z } from "zod";
import type { ajusteDeStock } from "../deposito/esquemas.js";

// Cada producto con movimientos. Las cantidades y los importes llegan como texto, con sus
// decimales. Quien no ve los números del negocio recibe el costo en null y el valor en "0".
export type FilaDeStock = { id: string; stock: string; costo_neto: string | null; proveedor: string | null; valor: string; ultimo_movimiento: string | null };

// GET /stock
export type Stock = { productos: FilaDeStock[]; valor_total: number; por_proveedor: Record<string, { unidades: number; valor: number; productos: number }> };

// GET /stock/:productoId/movimientos: los últimos 200, del más nuevo al más viejo.
export type Movimiento = { id: string; tipo: string; cantidad: string; referencia_tipo: string | null; referencia_id: string | null; fecha: string; nota: string | null };

// POST /stock/:productoId/ajustes. La forma sale de la validación del servidor (decisión 89).
export type AjusteDeStock = z.input<typeof ajusteDeStock>;
export type StockAjustado = { stock: number; diferencia: number };

// GET /stock/cambios?marca= (specs/018, historia 5): el stock de los productos que se movieron desde
// la marca de la descarga anterior (sin marca, el de todos los que tienen movimientos), y la marca nueva.
export type StockQueCambio = { marca: string; stock: Record<string, string> };
