import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { VentaDelDia, VentasDelDia } from "@servidor/ventas";
import { api } from "../../api";
import { consultas } from "../../consultas";
import { useDelServidor } from "../del-servidor";
import { hoyLocal } from "../../formato";

export { hoyLocal };

// Las ventas de un día, una sola vez para «Hoy», «Anular» y «Cómo va el negocio», en el
// celular y en la computadora (decisión 72). Los tipos son los que responde el servidor.
export type { VentaDelDia, VentasDelDia };

const CLAVE = ["ventas"] as const;

export const confirmadas = (ventas: VentaDelDia[]): VentaDelDia[] => ventas.filter((v) => v.estado === "confirmada");

// Una venta nueva o anulada cambia el día: lo que haya en pantalla se vuelve a pedir.
export const ventasCambiaron = (): Promise<void> => consultas.invalidateQueries({ queryKey: CLAVE });

// El servidor contestó que no (trae su estado) o no se llegó al servidor.
export const fueSinConexion = (error: unknown): boolean => !(error as { estado?: number } | null)?.estado;

// `dia` en AAAA-MM-DD; sin día (o con el de hoy) es hoy, que lo decide el servidor con la hora del local.
export function useVentasDelDia(dia: string | null = null) {
  const pedido = dia && dia !== hoyLocal() ? dia : null;
  const consulta = useQuery({
    queryKey: [...CLAVE, pedido ?? "hoy"],
    queryFn: () => api<VentasDelDia>(`/ventas${pedido ? `?dia=${pedido}` : ""}`),
  }, consultas);
  const { refetch } = consulta;
  const recargar = useCallback(() => { void refetch({ cancelRefetch: false }); }, [refetch]);
  return { datos: consulta.data ?? null, error: consulta.error, cargando: consulta.isFetching, recargar };
}

// Anular una venta: queda marcada y sus productos vuelven al stock. Rechaza con el error del
// servidor, o sin `estado` si no hubo conexión; quien llama decide cómo decirlo.
export function useAnularVenta() {
  const anulacion = useMutation({
    mutationFn: ({ venta, motivo }: { venta: VentaDelDia; motivo: string }) => api(`/ventas/${venta.id}/anular`, { method: "POST", body: JSON.stringify({ motivo }) }),
    onSuccess: ventasCambiaron,
  }, consultas);
  return { anular: (venta: VentaDelDia, motivo: string): Promise<unknown> => anulacion.mutateAsync({ venta, motivo }), anulando: anulacion.isPending };
}

// Lo que se consultó y no se llevó (RF «No llevó»), para Cómo va el negocio.
export type Consulta = { id: string; fecha: string; descripcion: string; precio_ofrecido: string | null; motivo: string | null };
export const CONSULTAS = ["consultas"] as const;
export const useConsultas = () => useDelServidor<Consulta[]>(CONSULTAS, "/consultas");
