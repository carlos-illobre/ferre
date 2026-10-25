import { useState } from "react";
import { diaAnterior, resumenDelDia } from "./resumen-del-dia";
import { fueSinConexion, motivoDeAnulacion, plano, SIN_MOTIVO, useAnularVenta, useVentasDelDia, type VentaDelDia } from "./ventas-del-dia";

// Lo que se llevó, para el renglón de la lista: buscando, el producto que coincide; si no, el único
// que tiene. `mas` es cuántos otros productos hay.
export function loQueSeLlevo(v: VentaDelDia, buscado: string): { una: VentaDelDia["items"][number] | null; mas: number } {
  const coincide = buscado.trim() ? v.items.find((i) => plano(i.descripcion).includes(plano(buscado))) : undefined;
  const una = coincide ?? (v.items.length === 1 ? v.items[0]! : null);
  return { una, mas: una ? v.items.length - 1 : v.items.length };
}

// Cuánto suman las que no están anuladas.
export const sumaDeConfirmadas = (ventas: VentaDelDia[]): number => ventas.filter((v) => v.estado === "confirmada").reduce((s, v) => s + Number(v.total), 0);

// «Otro día»: hoy y los seis anteriores.
export function ultimosSieteDias(hoy: string): string[] {
  const dias = [hoy];
  while (dias.length < 7) dias.push(diaAnterior(dias[dias.length - 1]!));
  return dias;
}

// Los filtros de la lista: todas, las de cuenta corriente (no anuladas) y las anuladas.
export type FiltroDeVentas = "todas" | "cuenta" | "anuladas";
export const pasaElFiltro = (v: VentaDelDia, f: FiltroDeVentas): boolean =>
  f === "todas" || (f === "cuenta" ? v.medio_pago === "cuenta_corriente" && v.estado !== "anulada" : v.estado === "anulada");

// Anular con un motivo de la lista (empieza en «Sin motivo») y un comentario (decisión 110).
export const SIN_CONEXION_PARA_ANULAR = "Sin conexión: para anular hace falta internet. Probá de nuevo cuando vuelva.";
export function useAnularConMotivo(venta: VentaDelDia, alAnular: () => void) {
  const [motivo, setMotivo] = useState<string>(SIN_MOTIVO);
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { anular, anulando } = useAnularVenta();
  async function confirmar() {
    setError(null);
    try { await anular(venta, motivoDeAnulacion(motivo, comentario)); alAnular(); }
    catch (e) { setError(fueSinConexion(e) ? SIN_CONEXION_PARA_ANULAR : `${(e as Error).message}.`); }
  }
  return { motivo, setMotivo, comentario, setComentario, error, anulando, confirmar };
}

// El resumen de un día de «Otro día», cuando llega.
export function useResumenDeOtroDia(dia: string, esHoy: boolean) {
  const { datos } = useVentasDelDia(esHoy ? null : dia);
  return datos ? resumenDelDia(datos.ventas) : null;
}
