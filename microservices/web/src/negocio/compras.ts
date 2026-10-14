import { api } from "../api";
import { consultas } from "../consultas";
import { useDelServidor } from "./del-servidor";
import { stockCambio } from "./deposito/inventario";

// Las compras recientes y los gastos, una sola vez para el celular y la computadora (RNF-60).
// Están en Cómo va el negocio (decisión 67); anular una devuelve el stock que sumó.
export type CompraFila = { id: string; fecha: string; comprobante_tipo: string; comprobante_numero: string | null; foto: string | null; total: string; estado: string; proveedor: string; renglones: string; items: { descripcion: string; cantidad: string; costo_unitario: string }[] };
export type Gastos = { desde: string; por_proveedor: { proveedor: string; compras: string; total: string }[]; total: number };

const COMPRAS = ["compras"] as const;

export const useComprasRecientes = () => useDelServidor<CompraFila[]>(COMPRAS, "/compras");
export const useGastosDeLaSemana = () => useDelServidor<Gastos>([...COMPRAS, "semana"], "/compras/semana");

export const nombreDelComprobante = (c: CompraFila): string =>
  c.comprobante_tipo === "sin_comprobante" ? "sin comprobante" : `${c.comprobante_tipo}${c.comprobante_numero ? ` ${c.comprobante_numero}` : c.foto ? " con foto" : " sin foto"}`;

export async function anularCompra(id: string, motivo: string): Promise<void> {
  await api(`/compras/${id}/anular`, { method: "POST", body: JSON.stringify({ motivo: motivo.trim() }) });
  await consultas.invalidateQueries({ queryKey: COMPRAS });
  void stockCambio();
}
