import { api } from "../api";
import { consultas } from "../consultas";
import { useDelServidor } from "./del-servidor";
import { stockCambio } from "./deposito/inventario";
import type { AnulacionDeCompra, CompraReciente, GastosDeLaSemana } from "@servidor/compras";

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
