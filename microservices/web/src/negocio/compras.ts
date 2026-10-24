import { api } from "../api";
import { consultas } from "../consultas";
import { useDelServidor } from "./del-servidor";
import { stockCambio } from "./deposito/inventario";
import type { AnulacionDeCompra, CompraReciente, GastosDeLaSemana } from "@servidor/compras";
import type { Pedido } from "@servidor/pedidos";

// Las compras recientes y los gastos, una sola vez para el celular y la computadora (RNF-60).
// Están en Cómo va el negocio (decisión 67); anular una devuelve el stock que sumó.
export type CompraFila = CompraReciente;
export type Gastos = GastosDeLaSemana;

const COMPRAS = ["compras"] as const;

export const useComprasRecientes = () => useDelServidor<CompraFila[]>(COMPRAS, "/compras");
export const useGastosDeLaSemana = () => useDelServidor<Gastos>([...COMPRAS, "semana"], "/compras/semana");

export const nombreDelComprobante = (c: CompraFila): string =>
  c.comprobante_tipo === "sin_comprobante" ? "sin comprobante" : `${c.comprobante_tipo}${c.comprobante_numero ? ` ${c.comprobante_numero}` : c.foto ? " con foto" : " sin foto"}`;

export async function anularCompra(id: string, motivo: string): Promise<void> {
  await api(`/compras/${id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivo.trim() } satisfies AnulacionDeCompra) });
  await consultas.invalidateQueries({ queryKey: COMPRAS });
  void stockCambio();
}

// Compras como la v2 (decisión 148): lo que muestran arriba las dos interfaces.
export type { Pedido };
const PEDIDOS = ["pedidos"] as const;
// Los pedidos que se mandaron y todavía no llegaron enteros: los «por llegar».
export function usePedidosPorLlegar(activo: boolean) {
  const { datos, error } = useDelServidor<Pedido[]>(PEDIDOS, "/pedidos", { activo });
  const porLlegar = (datos ?? []).filter((p) => p.estado === "enviado" || p.estado === "recibido_parcial");
  return { porLlegar: datos ? porLlegar : null, error };
}
export const faltanDe = (p: Pedido) => p.items.filter((i) => Number(i.recibido) < Number(i.cantidad)).length;

// Los siete días de la semana de los gastos, del primero al último. Lo de cada día sale de las
// compras recientes sin anular; si esas compras no alcanzan para explicar el total de la semana
// (hay más de las que trae la lista), no se dibuja nada: mejor vacío que un número que no cierra.
export function gastoPorDia(gastos: Gastos | null, compras: CompraFila[] | null): { letra: string; total: number }[] | null {
  if (!gastos || !compras) return null;
  const desde = new Date(`${gastos.desde}T00:00:00`);
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(desde.getTime() + i * 86_400_000); return { clave: d.toISOString().slice(0, 10), letra: "DLMMJVS"[d.getDay()]!, total: 0 }; });
  for (const c of compras) {
    if (c.estado === "anulada") continue;
    const dia = dias.find((d) => d.clave === c.fecha.slice(0, 10));
    if (dia) dia.total += Number(c.total);
  }
  const suma = dias.reduce((s, d) => s + d.total, 0);
  return Math.abs(suma - gastos.total) < 1 ? dias.map(({ letra, total }) => ({ letra, total })) : null;
}
// La inicial de cada día de la semana de los gastos (sin gastos, la semana de lunes a domingo).
export const letrasDeLaSemana = (gastos: Gastos | null): string[] => {
  if (!gastos) return [..."LMMJVSD"];
  const desde = new Date(`${gastos.desde}T00:00:00`);
  return Array.from({ length: 7 }, (_, i) => "DLMMJVS"[new Date(desde.getTime() + i * 86_400_000).getDay()]!);
};
// Las compras recientes que caen en la semana de los gastos.
export const esDeLaSemana = (c: CompraFila, gastos: Gastos | null): boolean => {
  if (!gastos) return false;
  const desde = new Date(`${gastos.desde}T00:00:00`).getTime();
  const dia = new Date(`${c.fecha.slice(0, 10)}T00:00:00`).getTime();
  return dia >= desde && dia < desde + 7 * 86_400_000;
};
